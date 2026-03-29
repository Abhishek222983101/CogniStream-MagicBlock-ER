"""
Anonymize Router - POST /api/anonymize
De-identifies patient records using NER pipeline.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

router = APIRouter()


class AnonymizeRequest(BaseModel):
    patient_data: dict[str, Any]


@router.post("/api/anonymize")
async def anonymize_patient(request: AnonymizeRequest):
    """
    Anonymize a patient record by detecting and replacing PII entities.

    Accepts raw patient data dict, returns anonymized version with
    entity detection results and replacement mapping.
    """
    from backend.main import get_anonymizer

    anonymizer = get_anonymizer()
    if anonymizer is None:
        raise HTTPException(status_code=503, detail="Anonymizer not available")

    try:
        result = anonymizer.anonymize(request.patient_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anonymization failed: {str(e)}")
