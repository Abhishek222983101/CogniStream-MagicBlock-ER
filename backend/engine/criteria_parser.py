"""
Criteria Parser - Decomposes raw trial criteria text into structured ParsedCriterion objects.
Uses regex patterns for common clinical criteria patterns.
Falls back to Mistral API for complex criteria.
"""

import re
import logging
import json
from typing import Optional

from backend.schemas.trial import ParsedCriterion

logger = logging.getLogger(__name__)


class CriteriaParser:
    """Parses raw criteria text into structured criterion objects."""

    def __init__(self):
        self.mistral_client = None

    def set_mistral_client(self, client):
        """Set the Mistral API client for complex criteria parsing."""
        self.mistral_client = client

    def parse_criteria(
        self,
        inclusion_text: Optional[str],
        exclusion_text: Optional[str],
    ) -> tuple[list[ParsedCriterion], list[ParsedCriterion]]:
        """
        Parse raw inclusion and exclusion criteria text.
        Returns (parsed_inclusion, parsed_exclusion).
        """
        inclusion = []
        exclusion = []

        if inclusion_text:
            raw_items = self._split_criteria(inclusion_text)
            for item in raw_items:
                parsed = self._parse_single(item, "inclusion")
                if parsed:
                    inclusion.append(parsed)

        if exclusion_text:
            raw_items = self._split_criteria(exclusion_text)
            for item in raw_items:
                parsed = self._parse_single(item, "exclusion")
                if parsed:
                    exclusion.append(parsed)

        return inclusion, exclusion

    def _split_criteria(self, text: str) -> list[str]:
        """Split criteria text into individual criterion items."""
        # Split on numbered items: "1.", "2.", etc. or bullet points "* ", "- "
        items = re.split(r"\n\s*(?:\d+[\.\)]\s*|\*\s+|-\s+)", text)

        # Also try splitting on just newlines if above didn't work well
        if len(items) <= 1:
            items = [line.strip() for line in text.split("\n") if line.strip()]

        # Clean up
        cleaned = []
        for item in items:
            item = item.strip()
            # Remove leading bullet/number artifacts
            item = re.sub(r"^\d+[\.\)]\s*", "", item)
            item = re.sub(r"^\*\s*", "", item)
            item = re.sub(r"^-\s*", "", item)
            if item and len(item) > 5:  # Skip very short fragments
                cleaned.append(item)

        return cleaned

    def _parse_single(self, text: str, crit_type: str) -> Optional[ParsedCriterion]:
        """Parse a single criterion text into a ParsedCriterion."""
        text = text.strip()
        if not text:
            return None

        # Try pattern-based parsing first
        parsed = self._pattern_parse(text, crit_type)
        if parsed and parsed.category == "hard":
            return parsed

        # Default: return as semantic criterion
        return ParsedCriterion(
            text=text,
            type=crit_type,
            category="semantic",
        )

    def _pattern_parse(self, text: str, crit_type: str) -> Optional[ParsedCriterion]:
        """Try to parse criterion using regex patterns."""
        lower = text.lower()

        # Age patterns
        age_patterns = [
            (r"age\s*(?:>=|≥|at least|minimum|over)\s*(\d+)", ">="),
            (r"age\s*(?:<=|≤|no more than|maximum|under|below)\s*(\d+)", "<="),
            (r"age\s*>\s*(\d+)", ">"),
            (r"age\s*<\s*(\d+)", "<"),
            (r"(?:>=|≥|at least|minimum)\s*(\d+)\s*(?:years|yrs)", ">="),
            (r"(?:<=|≤|no more than|maximum)\s*(\d+)\s*(?:years|yrs)", "<="),
            (
                r"(\d+)\s*(?:years|yrs)\s*(?:of age|old)\s*(?:or older|and above|and over)",
                ">=",
            ),
            (r"(?:older than|above)\s*(\d+)", ">"),
            (r"(?:younger than|under|below)\s*(\d+)", "<"),
            (
                r"(?:between|from)\s*(\d+)\s*(?:and|to|-)\s*(\d+)\s*(?:years|yrs)?",
                "range",
            ),
            (r"(\d+)\s*(?:to|-)\s*(\d+)\s*(?:years|yrs)", "range"),
            (r"(?:more than|over)\s*(\d+)\s*years", ">="),
            (r"(?:under|below)\s*(\d+)\s*years", "<"),
        ]

        for pattern, op in age_patterns:
            match = re.search(pattern, lower)
            if match:
                if op == "range":
                    # Return two criteria for range
                    return ParsedCriterion(
                        text=text,
                        type=crit_type,
                        category="hard",
                        field="age",
                        operator=">=",
                        value=match.group(1),
                    )
                return ParsedCriterion(
                    text=text,
                    type=crit_type,
                    category="hard",
                    field="age",
                    operator=op,
                    value=match.group(1),
                )

        # ECOG patterns
        ecog_patterns = [
            (r"ecog\s*(?:ps|performance\s*status)?\s*(?:<=|≤|of|score)?\s*(\d)", "<="),
            (
                r"ecog\s*(?:ps|performance\s*status)?\s*(\d)\s*(?:or\s*(?:less|below|better))",
                "<=",
            ),
            (r"ecog\s*(?:ps|performance\s*status)?\s*(?:0|0-1|0-2)\b", "<="),
        ]
        for pattern, op in ecog_patterns:
            match = re.search(pattern, lower)
            if match:
                val = match.group(1) if match.lastindex else "2"
                return ParsedCriterion(
                    text=text,
                    type=crit_type,
                    category="hard",
                    field="ecog",
                    operator=op,
                    value=val,
                )

        # Gender patterns
        if re.search(r"\b(male|female)\s*(only|patients?|subjects?)\b", lower):
            gender = "male" if "male" in lower else "female"
            return ParsedCriterion(
                text=text,
                type=crit_type,
                category="hard",
                field="gender",
                operator="==",
                value=gender,
            )

        # Lab value patterns
        lab_patterns = {
            "hemoglobin": [
                r"(?:hemoglobin|hb|hgb)\s*(?:>=|≥|>|at least)\s*([\d.]+)",
                ">=",
            ],
            "platelets": [
                r"(?:platelet|plt)\s*(?:count)?\s*(?:>=|≥|>|at least)\s*([\d.]+)",
                ">=",
            ],
            "creatinine": [
                r"(?:creatinine|cr)\s*(?:<=|≤|<|less than)\s*([\d.]+)",
                "<=",
            ],
            "bilirubin": [
                r"(?:bilirubin|bili)\s*(?:<=|≤|<|less than)\s*([\d.]+)",
                "<=",
            ],
            "wbc": [
                r"(?:wbc|white\s*blood\s*cell|leukocyte)\s*(?:count)?\s*(?:>=|≥|>)\s*([\d.]+)",
                ">=",
            ],
            "alt": [r"(?:alt|alanine)\s*(?:<=|≤|<|less than)\s*([\d.]+)", "<="],
            "ast": [r"(?:ast|aspartate)\s*(?:<=|≤|<|less than)\s*([\d.]+)", "<="],
        }
        for lab_field, (pattern, op) in lab_patterns.items():
            match = re.search(pattern, lower)
            if match:
                return ParsedCriterion(
                    text=text,
                    type=crit_type,
                    category="hard",
                    field=lab_field,
                    operator=op,
                    value=match.group(1),
                )

        # Pregnancy exclusion
        if re.search(r"pregnan|lactating|breastfeed|nursing", lower):
            return ParsedCriterion(
                text=text,
                type=crit_type,
                category="hard",
                field="pregnancy",
                operator="==",
                value="false",
            )

        return None

    async def parse_with_llm(
        self,
        inclusion_text: Optional[str],
        exclusion_text: Optional[str],
    ) -> tuple[list[ParsedCriterion], list[ParsedCriterion]]:
        """
        Use LLM API to parse complex criteria.
        Falls back to pattern-based parsing if API fails.
        """
        if not self.mistral_client:
            return self.parse_criteria(inclusion_text, exclusion_text)

        try:
            combined = ""
            if inclusion_text:
                combined += f"INCLUSION CRITERIA:\n{inclusion_text}\n\n"
            if exclusion_text:
                combined += f"EXCLUSION CRITERIA:\n{exclusion_text}\n\n"

            prompt = (
                "Parse the following clinical trial criteria into structured JSON. "
                "For each criterion, extract:\n"
                '- "text": the original criterion text\n'
                '- "type": "inclusion" or "exclusion"\n'
                '- "category": "hard" (can be evaluated with rules: age, gender, ECOG, lab values) '
                'or "semantic" (needs ML: diagnosis, biomarkers, treatment history)\n'
                '- "field": the clinical field (age, gender, ecog, stage, hemoglobin, etc.) or null\n'
                '- "operator": comparison operator (>=, <=, ==, etc.) or null\n'
                '- "value": the threshold value or null\n\n'
                f"CRITERIA:\n{combined}\n"
                "Return a JSON array of parsed criteria objects."
            )

            response = await self.mistral_client.chat(prompt)
            # Try to parse LLM response as JSON
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if json_match:
                parsed_list = json.loads(json_match.group())
                inclusion = []
                exclusion = []
                for item in parsed_list:
                    pc = ParsedCriterion(**item)
                    if pc.type == "exclusion":
                        exclusion.append(pc)
                    else:
                        inclusion.append(pc)
                return inclusion, exclusion

        except Exception as e:
            logger.warning(f"LLM criteria parsing failed, using pattern-based: {e}")

        return self.parse_criteria(inclusion_text, exclusion_text)
