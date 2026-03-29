"""
Trials Router - GET /api/trials
List and filter clinical trials from data/trials.json.
"""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/api/trials")
async def list_trials(
    condition: Optional[str] = Query(
        None, description="Filter by condition (substring match)"
    ),
    state: Optional[str] = Query(None, description="Filter by state"),
    status: Optional[str] = Query(None, description="Filter by trial status"),
    phase: Optional[str] = Query(None, description="Filter by phase"),
    limit: int = Query(50, ge=1, le=200, description="Max results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    List clinical trials with optional filters.
    Returns trials from the local data/trials.json dataset.
    """
    from backend.main import get_trials_data

    trials = get_trials_data()

    # Apply filters
    filtered = trials

    if condition:
        condition_lower = condition.lower()
        filtered = [
            t
            for t in filtered
            if any(condition_lower in c.lower() for c in t.get("conditions", []))
            or condition_lower in t.get("title", "").lower()
        ]

    if state:
        state_lower = state.lower()
        filtered = [
            t
            for t in filtered
            if any(
                state_lower in (loc.get("state", "") or "").lower()
                for loc in t.get("locations", [])
            )
        ]

    if status:
        status_upper = status.upper()
        filtered = [
            t for t in filtered if (t.get("status", "") or "").upper() == status_upper
        ]

    if phase:
        phase_lower = phase.lower()
        filtered = [
            t for t in filtered if phase_lower in (t.get("phase", "") or "").lower()
        ]

    total = len(filtered)
    paginated = filtered[offset : offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "trials": paginated,
    }


@router.get("/api/trials/{trial_id}")
async def get_trial(trial_id: str):
    """Get a single trial by ID."""
    from backend.main import get_trials_data

    trials = get_trials_data()
    for t in trials:
        if t.get("trial_id") == trial_id:
            return t

    from fastapi import HTTPException

    raise HTTPException(status_code=404, detail=f"Trial {trial_id} not found")
