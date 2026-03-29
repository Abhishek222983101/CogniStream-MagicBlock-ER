"""
Pydantic models for clinical trials.
Matches the exact structure in data/trials.json.
"""

from typing import Optional
from pydantic import BaseModel, Field


class TrialLocation(BaseModel):
    facility: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    lat: Optional[float] = None
    lng: Optional[float] = None


class AgeRange(BaseModel):
    min: Optional[str] = None  # "18 Years"
    max: Optional[str] = None  # "75 Years"

    def min_years(self) -> Optional[int]:
        """Extract numeric min age."""
        if self.min:
            try:
                return int(self.min.split()[0])
            except (ValueError, IndexError):
                return None
        return None

    def max_years(self) -> Optional[int]:
        """Extract numeric max age."""
        if self.max:
            try:
                return int(self.max.split()[0])
            except (ValueError, IndexError):
                return None
        return None


class ParsedCriterion(BaseModel):
    """A single decomposed criterion from raw criteria text."""

    text: str
    type: str = "inclusion"  # "inclusion" or "exclusion"
    category: str = "semantic"  # "hard" (rule-evaluable) or "semantic" (needs ML)
    field: Optional[str] = None  # "age", "gender", "stage", "ecog", "lab", etc.
    operator: Optional[str] = None  # ">=", "<=", "==", "in", "not_in"
    value: Optional[str] = None  # The threshold/expected value


class ClinicalTrial(BaseModel):
    trial_id: str
    title: str
    conditions: list[str] = Field(default_factory=list)
    phase: Optional[str] = None
    status: Optional[str] = None
    sponsor: Optional[str] = None
    locations: list[TrialLocation] = Field(default_factory=list)
    inclusion_criteria_raw: Optional[str] = None
    exclusion_criteria_raw: Optional[str] = None
    age_range: Optional[AgeRange] = None
    gender: Optional[str] = "All"
    fetched_at: Optional[str] = None

    # Parsed criteria (populated by criteria_parser)
    parsed_inclusion: list[ParsedCriterion] = Field(default_factory=list)
    parsed_exclusion: list[ParsedCriterion] = Field(default_factory=list)

    def get_criteria_text(self) -> str:
        """Combine raw criteria into single text block for embedding."""
        parts = []
        if self.inclusion_criteria_raw:
            parts.append(f"Inclusion: {self.inclusion_criteria_raw}")
        if self.exclusion_criteria_raw:
            parts.append(f"Exclusion: {self.exclusion_criteria_raw}")
        return "\n".join(parts)
