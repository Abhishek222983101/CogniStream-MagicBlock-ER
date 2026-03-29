"""
Pydantic models for match results and API responses.
"""

from typing import Optional
from pydantic import BaseModel, Field


class CriterionResult(BaseModel):
    """Result of evaluating a single criterion against a patient."""

    criterion: str
    type: str  # "inclusion" or "exclusion"
    category: str  # "hard" or "semantic"
    status: str  # "PASS", "FAIL", "UNCLEAR"
    confidence: float = 0.0  # 0-100
    detail: Optional[str] = None
    reasoning: Optional[str] = None


class ScoreBreakdown(BaseModel):
    """Breakdown of the composite score by component."""

    rule_engine: float = 0.0
    embedding_similarity: float = 0.0
    llm_confidence: float = 0.0
    geographic: float = 0.0


class MatchResult(BaseModel):
    """A single trial match result."""

    trial_id: str
    trial_title: str
    composite_score: float = 0.0
    rank: int = 0
    location: Optional[dict] = None
    distance_km: Optional[float] = None
    criteria_results: list[CriterionResult] = Field(default_factory=list)
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    exclusion_triggered: bool = False


class MatchResponse(BaseModel):
    """Full match response returned by the API."""

    patient_id: str
    patient_summary: str
    total_trials_screened: int = 0
    matches: list[MatchResult] = Field(default_factory=list)


class AnonymizeResponse(BaseModel):
    """Response from anonymization endpoint."""

    anonymized_data: dict
    entities_found: list[dict] = Field(default_factory=list)
    replacements: dict = Field(default_factory=dict)


class HealthResponse(BaseModel):
    """Response from health check endpoint."""

    status: str = "ok"
    models_loaded: dict = Field(default_factory=dict)
    gpu_available: bool = False
    gpu_name: Optional[str] = None
    gpu_memory_gb: Optional[float] = None
