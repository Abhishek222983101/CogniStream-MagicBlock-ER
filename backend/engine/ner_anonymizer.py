"""
NER Anonymizer - De-identifies patient records.
Uses BERT-NER (dslim/bert-base-NER) for PII detection
and scispacy (en_core_sci_md) for medical entity awareness.
"""

import logging
import re
import hashlib
from typing import Any

logger = logging.getLogger(__name__)


class NERAnonymizer:
    """Anonymizes patient records by detecting and replacing PII entities."""

    def __init__(self):
        self.ner_pipeline = None
        self.nlp = None
        self._loaded = False

    def load(self):
        """Load NER models. Called during app startup."""
        if self._loaded:
            return

        try:
            from transformers import pipeline

            logger.info("Loading BERT-NER model (dslim/bert-base-NER)...")
            self.ner_pipeline = pipeline(
                "ner",
                model="dslim/bert-base-NER",
                aggregation_strategy="simple",
                device=-1,  # CPU for NER (fast enough, saves GPU for LLM)
            )
            logger.info("BERT-NER loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load BERT-NER: {e}")
            self.ner_pipeline = None

        try:
            import spacy

            logger.info("Loading scispacy model (en_core_sci_md)...")
            self.nlp = spacy.load("en_core_sci_md")
            logger.info("scispacy loaded successfully.")
        except Exception as e:
            logger.warning(f"scispacy not available, using BERT-NER only: {e}")
            self.nlp = None

        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded and self.ner_pipeline is not None

    def _generate_token(self, entity_type: str, value: str) -> str:
        """Generate a consistent anonymized token for a given entity."""
        hash_val = hashlib.md5(value.encode()).hexdigest()[:6].upper()
        return f"[{entity_type}_{hash_val}]"

    def anonymize(self, patient_data: dict) -> dict:
        """
        Anonymize a patient record.

        Returns:
            dict with keys:
                - anonymized_data: the patient dict with PII replaced
                - entities_found: list of detected entities
                - replacements: mapping of original -> anonymized values
        """
        if not self.is_loaded:
            logger.warning("NER models not loaded, returning data with basic masking.")
            return self._basic_anonymize(patient_data)

        import copy

        anonymized = copy.deepcopy(patient_data)
        entities_found = []
        replacements = {}

        # 1. Handle known PII fields directly
        demographics = anonymized.get("demographics", {})

        # Name
        if demographics.get("name"):
            original_name = demographics["name"]
            token = self._generate_token("PERSON", original_name)
            replacements[original_name] = token
            demographics["name"] = token
            entities_found.append(
                {
                    "text": original_name,
                    "type": "PERSON",
                    "source": "demographics.name",
                    "replacement": token,
                }
            )

        # City (keep for geo matching but flag it)
        if demographics.get("city"):
            original_city = demographics["city"]
            entities_found.append(
                {
                    "text": original_city,
                    "type": "LOCATION",
                    "source": "demographics.city",
                    "replacement": "(kept for geo-matching)",
                }
            )

        # 2. Run NER on clinical_notes if present
        clinical_notes = anonymized.get("clinical_notes", "")
        if clinical_notes and self.ner_pipeline:
            try:
                ner_results = self.ner_pipeline(clinical_notes)
                # Sort by position descending so replacements don't shift indices
                ner_results_sorted = sorted(
                    ner_results, key=lambda x: x["start"], reverse=True
                )
                for entity in ner_results_sorted:
                    etype = entity["entity_group"]
                    word = entity["word"]
                    score = entity["score"]

                    if etype in ("PER", "LOC", "ORG") and score > 0.7:
                        token = self._generate_token(etype, word)
                        if word not in replacements:
                            replacements[word] = token
                        entities_found.append(
                            {
                                "text": word,
                                "type": etype,
                                "source": "clinical_notes",
                                "replacement": token,
                                "confidence": round(float(score), 3),
                            }
                        )
                        clinical_notes = (
                            clinical_notes[: entity["start"]]
                            + token
                            + clinical_notes[entity["end"] :]
                        )
                anonymized["clinical_notes"] = clinical_notes
            except Exception as e:
                logger.error(f"NER failed on clinical_notes: {e}")

        # 3. Run scispacy for medical entity detection (informational, not replaced)
        if self.nlp and clinical_notes:
            try:
                doc = self.nlp(patient_data.get("clinical_notes", ""))
                for ent in doc.ents:
                    entities_found.append(
                        {
                            "text": ent.text,
                            "type": "MEDICAL",
                            "source": "clinical_notes (scispacy)",
                            "label": ent.label_,
                            "replacement": "(medical entity - kept)",
                        }
                    )
            except Exception as e:
                logger.warning(f"scispacy processing failed: {e}")

        # 4. Scrub any remaining PII patterns (phone, email, Aadhaar)
        anonymized = self._scrub_patterns(anonymized, replacements, entities_found)

        return {
            "anonymized_data": anonymized,
            "entities_found": entities_found,
            "replacements": replacements,
        }

    def _scrub_patterns(self, data: dict, replacements: dict, entities: list) -> dict:
        """Regex-based scrubbing of phone numbers, emails, Aadhaar numbers."""
        patterns = {
            "PHONE": r"\b(?:\+91[\s-]?)?[6-9]\d{9}\b",
            "EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "AADHAAR": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        }

        import json

        data_str = json.dumps(data)

        for ptype, pattern in patterns.items():
            for match in re.finditer(pattern, data_str):
                original = match.group()
                token = self._generate_token(ptype, original)
                replacements[original] = token
                entities.append(
                    {
                        "text": original,
                        "type": ptype,
                        "source": "regex_pattern",
                        "replacement": token,
                    }
                )
                data_str = data_str.replace(original, token)

        return json.loads(data_str)

    def _basic_anonymize(self, patient_data: dict) -> dict:
        """Fallback anonymization when NER models aren't loaded."""
        import copy

        anonymized = copy.deepcopy(patient_data)
        replacements = {}
        entities_found = []

        demographics = anonymized.get("demographics", {})
        if demographics.get("name"):
            original = demographics["name"]
            token = self._generate_token("PERSON", original)
            demographics["name"] = token
            replacements[original] = token
            entities_found.append(
                {
                    "text": original,
                    "type": "PERSON",
                    "source": "demographics.name",
                    "replacement": token,
                }
            )

        return {
            "anonymized_data": anonymized,
            "entities_found": entities_found,
            "replacements": replacements,
        }
