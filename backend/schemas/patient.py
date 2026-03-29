"""
Pydantic models for patient records.
Matches the exact structure in data/patients.json.
"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class Demographics(BaseModel):
    age: int = 0
    gender: str = "Unknown"  # Default to "Unknown" if LLM extraction fails
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    @field_validator("gender", mode="before")
    @classmethod
    def default_gender(cls, v):
        """Convert None to 'Unknown' for gender field."""
        if v is None or v == "":
            return "Unknown"
        return v

    @field_validator("age", mode="before")
    @classmethod
    def default_age(cls, v):
        """Convert None to 0 for age field."""
        if v is None:
            return 0
        return v


class Diagnosis(BaseModel):
    primary: str
    subtype: Optional[str] = None
    stage: Optional[str] = None
    icd10: Optional[str] = None
    biomarkers: Optional[dict] = None


class LabValues(BaseModel):
    hemoglobin: Optional[float] = None
    wbc: Optional[float] = None
    platelets: Optional[float] = None
    creatinine: Optional[float] = None
    bilirubin: Optional[float] = None
    alt: Optional[float] = None
    ast: Optional[float] = None


class PriorTreatment(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    date: Optional[str] = None
    hospital: Optional[str] = None


class PatientRecord(BaseModel):
    patient_id: str
    demographics: Demographics
    diagnosis: Diagnosis
    medical_history: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    prior_treatments: list[PriorTreatment] = Field(default_factory=list)
    lab_values: Optional[LabValues] = None
    ecog_status: Optional[int] = None
    smoking_status: Optional[str] = None
    allergies: list[str] = Field(default_factory=list)
    clinical_notes: Optional[str] = None

    def to_summary_text(self) -> str:
        """Generate a concise text summary for ML matching."""
        parts = []
        d = self.demographics
        parts.append(f"{d.age}yo {d.gender}")
        if d.city:
            parts.append(f"from {d.city}, {d.state or ''}")

        dx = self.diagnosis
        parts.append(f"Diagnosis: {dx.primary}")
        if dx.subtype:
            parts.append(f"Subtype: {dx.subtype}")
        if dx.stage:
            parts.append(f"Stage: {dx.stage}")
        if dx.biomarkers:
            bio_str = ", ".join(f"{k}: {v}" for k, v in dx.biomarkers.items())
            parts.append(f"Biomarkers: {bio_str}")

        if self.medical_history:
            parts.append(f"History: {', '.join(self.medical_history)}")
        if self.medications:
            parts.append(f"Medications: {', '.join(self.medications)}")
        if self.ecog_status is not None:
            parts.append(f"ECOG: {self.ecog_status}")
        if self.smoking_status:
            parts.append(f"Smoking: {self.smoking_status}")

        if self.lab_values:
            lv = self.lab_values
            lab_parts = []
            if lv.hemoglobin is not None:
                lab_parts.append(f"Hb={lv.hemoglobin}")
            if lv.wbc is not None:
                lab_parts.append(f"WBC={lv.wbc}")
            if lv.platelets is not None:
                lab_parts.append(f"Plt={lv.platelets}")
            if lv.creatinine is not None:
                lab_parts.append(f"Cr={lv.creatinine}")
            if lv.bilirubin is not None:
                lab_parts.append(f"Bili={lv.bilirubin}")
            if lv.alt is not None:
                lab_parts.append(f"ALT={lv.alt}")
            if lv.ast is not None:
                lab_parts.append(f"AST={lv.ast}")
            if lab_parts:
                parts.append(f"Labs: {', '.join(lab_parts)}")

        if self.prior_treatments:
            tx_strs = []
            for tx in self.prior_treatments:
                tx_str = tx.name or tx.type or "Unknown"
                tx_strs.append(tx_str)
            parts.append(f"Prior treatment: {', '.join(tx_strs)}")

        return ". ".join(parts)
