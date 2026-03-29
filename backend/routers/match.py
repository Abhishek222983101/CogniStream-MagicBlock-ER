"""
Match Router - POST /api/match, POST /api/match-all
Core matching endpoints that orchestrate the full ML pipeline.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


class MatchRequest(BaseModel):
    patient_id: Optional[str] = None
    patient_data: Optional[dict] = None  # Raw patient data (alternative to ID)
    trial_ids: list[str] = Field(default_factory=list)


class MatchAllRequest(BaseModel):
    patient_id: Optional[str] = None
    patient_data: Optional[dict] = None
    limit: int = Field(default=20, ge=1, le=100)


@router.post("/api/match")
async def match_patient_to_trials(request: MatchRequest):
    """
    Match a patient against specific trials.
    Provide either patient_id (to look up from patients.json) or patient_data (raw dict).
    Provide trial_ids to match against specific trials only.
    """
    from backend.main import get_scorer, get_patient, get_trial_objects

    scorer = get_scorer()
    if scorer is None:
        raise HTTPException(status_code=503, detail="Scoring engine not initialized")

    # Resolve patient
    patient = _resolve_patient(request.patient_id, request.patient_data)

    # Resolve trials
    if request.trial_ids:
        trials = get_trial_objects(request.trial_ids)
        if not trials:
            raise HTTPException(
                status_code=404, detail="No matching trials found for given IDs"
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide trial_ids. Use /api/match-all to match against all trials.",
        )

    try:
        result = await scorer.match_patient_to_trials(patient, trials)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")


@router.post("/api/match-all")
async def match_patient_to_all_trials(request: MatchAllRequest):
    """
    Match a patient against ALL available trials.
    Returns ranked results sorted by composite score.
    """
    from backend.main import get_scorer, get_all_trial_objects

    scorer = get_scorer()
    if scorer is None:
        raise HTTPException(status_code=503, detail="Scoring engine not initialized")

    # Resolve patient
    patient = _resolve_patient(request.patient_id, request.patient_data)

    # Get all trials
    trials = get_all_trial_objects()
    if not trials:
        raise HTTPException(status_code=404, detail="No trials loaded")

    try:
        result = await scorer.match_patient_to_trials(patient, trials)
        # Apply limit
        if request.limit and len(result.matches) > request.limit:
            result.matches = result.matches[: request.limit]
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")


def _resolve_patient(patient_id: Optional[str], patient_data: Optional[dict]):
    """Resolve patient from ID or raw data."""
    from backend.main import get_patient
    from backend.schemas.patient import PatientRecord

    if patient_data:
        try:
            return PatientRecord(**patient_data)
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid patient data: {str(e)}"
            )

    if patient_id:
        patient = get_patient(patient_id)
        if patient is None:
            raise HTTPException(
                status_code=404, detail=f"Patient {patient_id} not found"
            )
        return patient

    raise HTTPException(
        status_code=400, detail="Provide either patient_id or patient_data"
    )
