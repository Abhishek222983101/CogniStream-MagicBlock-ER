"""
Patient Management Router
Handles saving, deleting, and listing patients.
Used for persisting uploaded patient data to data/patients.json.
"""

import json
import logging
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.config import PATIENTS_PATH
from backend.schemas.patient import PatientRecord

logger = logging.getLogger("trialmatch.routers.patients")

router = APIRouter(prefix="/api/patients", tags=["Patients"])


class SavePatientRequest(BaseModel):
    patient_data: dict = Field(..., description="Patient record data to save")


class SavePatientResponse(BaseModel):
    success: bool
    patient_id: str
    message: str


class DeletePatientResponse(BaseModel):
    success: bool
    patient_id: str
    message: str


class PatientListItem(BaseModel):
    patient_id: str
    age: int
    gender: str
    city: str | None
    diagnosis: str
    stage: str | None


@router.get("")
async def list_patients():
    """List all loaded patients (for dropdown/fetching)."""
    from backend.main import _patients_map

    return {
        "total": len(_patients_map),
        "patients": [
            {
                "patient_id": p.patient_id,
                "age": p.demographics.age,
                "gender": p.demographics.gender,
                "city": p.demographics.city,
                "diagnosis": p.diagnosis.primary,
                "stage": p.diagnosis.stage,
            }
            for p in _patients_map.values()
        ],
    }


def _save_patients_to_file(patients: list[dict]) -> None:
    """Write patients list to JSON file."""
    with open(PATIENTS_PATH, "w", encoding="utf-8") as f:
        json.dump(patients, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved {len(patients)} patients to {PATIENTS_PATH}")


def _load_patients_from_file() -> list[dict]:
    """Load patients list from JSON file."""
    if not PATIENTS_PATH.exists():
        return []
    with open(PATIENTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post(
    "", response_model=SavePatientResponse, status_code=status.HTTP_201_CREATED
)
async def save_patient(request: SavePatientRequest):
    """
    Save a new patient to data/patients.json.
    Creates a new entry if patient_id doesn't exist, updates if it does.
    """
    try:
        patient_data = request.patient_data

        if not patient_data.get("patient_id"):
            patient_data["patient_id"] = f"UPLOAD_{int(time.time() * 1000)}"

        patient_id = patient_data["patient_id"]

        patients = _load_patients_from_file()

        existing_index = None
        for i, p in enumerate(patients):
            if p.get("patient_id") == patient_id:
                existing_index = i
                break

        try:
            validated = PatientRecord(**patient_data)
            patient_dict = validated.model_dump()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid patient data: {str(e)}",
            )

        if existing_index is not None:
            patients[existing_index] = patient_dict
            message = f"Patient {patient_id} updated successfully"
        else:
            patients.append(patient_dict)
            message = f"Patient {patient_id} saved successfully"

        _save_patients_to_file(patients)

        from backend.main import _patients_map, _patients_raw

        _patients_raw = patients
        _patients_map[patient_id] = validated

        return SavePatientResponse(success=True, patient_id=patient_id, message=message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save patient: {str(e)}",
        )


@router.delete("/{patient_id}", response_model=DeletePatientResponse)
async def delete_patient(patient_id: str):
    """
    Delete a patient from data/patients.json by patient_id.
    """
    try:
        patients = _load_patients_from_file()

        original_count = len(patients)
        patients = [p for p in patients if p.get("patient_id") != patient_id]

        if len(patients) == original_count:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient {patient_id} not found",
            )

        _save_patients_to_file(patients)

        from backend.main import _patients_map, _patients_raw

        _patients_raw = patients
        _patients_map.pop(patient_id, None)

        return DeletePatientResponse(
            success=True,
            patient_id=patient_id,
            message=f"Patient {patient_id} deleted successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete patient: {str(e)}",
        )


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """
    Get a specific patient by ID.
    """
    from backend.main import _patients_map

    patient = _patients_map.get(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {patient_id} not found",
        )

    return patient
