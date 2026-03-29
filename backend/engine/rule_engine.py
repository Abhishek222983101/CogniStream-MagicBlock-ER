"""
Rule Engine - Deterministic evaluation of hard clinical criteria.
Evaluates age, gender, ECOG, lab values, stage against trial requirements.
No ML here - pure Python logic.
"""

import re
import logging
from typing import Optional

from backend.schemas.patient import PatientRecord
from backend.schemas.trial import ParsedCriterion
from backend.schemas.result import CriterionResult

logger = logging.getLogger(__name__)


class RuleEngine:
    """Deterministic rule-based evaluation of hard criteria."""

    def evaluate_criterion(
        self, patient: PatientRecord, criterion: ParsedCriterion
    ) -> CriterionResult:
        """Evaluate a single hard criterion against a patient."""
        field = (criterion.field or "").lower()

        evaluators = {
            "age": self._eval_age,
            "gender": self._eval_gender,
            "sex": self._eval_gender,
            "ecog": self._eval_ecog,
            "stage": self._eval_stage,
            "hemoglobin": self._eval_lab,
            "wbc": self._eval_lab,
            "platelets": self._eval_lab,
            "creatinine": self._eval_lab,
            "bilirubin": self._eval_lab,
            "alt": self._eval_lab,
            "ast": self._eval_lab,
        }

        evaluator = evaluators.get(field)
        if evaluator:
            return evaluator(patient, criterion)

        # Fallback: try to infer from criterion text
        return self._eval_from_text(patient, criterion)

    def evaluate_age_range(
        self, patient: PatientRecord, min_age: Optional[int], max_age: Optional[int]
    ) -> CriterionResult:
        """Direct age range check from trial's age_range field."""
        age = patient.demographics.age

        if min_age is not None and age < min_age:
            return CriterionResult(
                criterion=f"Age >= {min_age}",
                type="inclusion",
                category="hard",
                status="FAIL",
                confidence=100.0,
                detail=f"Patient age {age} is below minimum {min_age}",
            )
        if max_age is not None and age > max_age:
            return CriterionResult(
                criterion=f"Age <= {max_age}",
                type="inclusion",
                category="hard",
                status="FAIL",
                confidence=100.0,
                detail=f"Patient age {age} exceeds maximum {max_age}",
            )

        detail_parts = []
        if min_age is not None:
            detail_parts.append(f">= {min_age}")
        if max_age is not None:
            detail_parts.append(f"<= {max_age}")
        range_str = " and ".join(detail_parts) if detail_parts else "any"

        return CriterionResult(
            criterion=f"Age {range_str}",
            type="inclusion",
            category="hard",
            status="PASS",
            confidence=100.0,
            detail=f"Patient age {age} is within range ({range_str})",
        )

    def evaluate_gender(
        self, patient: PatientRecord, required_gender: Optional[str]
    ) -> Optional[CriterionResult]:
        """Direct gender check from trial's gender field."""
        if not required_gender or required_gender.lower() == "all":
            return None  # No restriction

        patient_gender = patient.demographics.gender.lower()
        required = required_gender.lower()

        if required in ("male", "female") and patient_gender != required:
            return CriterionResult(
                criterion=f"Gender: {required_gender}",
                type="inclusion",
                category="hard",
                status="FAIL",
                confidence=100.0,
                detail=f"Trial requires {required_gender}, patient is {patient.demographics.gender}",
            )

        return CriterionResult(
            criterion=f"Gender: {required_gender}",
            type="inclusion",
            category="hard",
            status="PASS",
            confidence=100.0,
            detail=f"Patient gender {patient.demographics.gender} matches requirement",
        )

    def _eval_age(
        self, patient: PatientRecord, criterion: ParsedCriterion
    ) -> CriterionResult:
        """Evaluate age criterion."""
        age = patient.demographics.age
        op = criterion.operator or ""
        try:
            val = int(criterion.value) if criterion.value else None
        except ValueError:
            val = None

        if val is None:
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="UNCLEAR",
                confidence=50.0,
                detail="Could not parse age threshold",
            )

        passed = self._compare(age, op, val)
        return CriterionResult(
            criterion=criterion.text,
            type=criterion.type,
            category="hard",
            status="PASS" if passed else "FAIL",
            confidence=100.0,
            detail=f"Patient age {age} {'meets' if passed else 'does not meet'} requirement ({op} {val})",
        )

    def _eval_gender(
        self, patient: PatientRecord, criterion: ParsedCriterion
    ) -> CriterionResult:
        """Evaluate gender criterion."""
        patient_gender = patient.demographics.gender.lower()
        required = (criterion.value or "").lower()

        if not required or required == "all":
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="PASS",
                confidence=100.0,
                detail="No gender restriction",
            )

        passed = patient_gender == required
        return CriterionResult(
            criterion=criterion.text,
            type=criterion.type,
            category="hard",
            status="PASS" if passed else "FAIL",
            confidence=100.0,
            detail=f"Patient is {patient.demographics.gender}, required: {criterion.value}",
        )

    def _eval_ecog(
        self, patient: PatientRecord, criterion: ParsedCriterion
    ) -> CriterionResult:
        """Evaluate ECOG performance status."""
        ecog = patient.ecog_status
        if ecog is None:
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="UNCLEAR",
                confidence=30.0,
                detail="Patient ECOG status not available",
            )

        try:
            val = int(criterion.value) if criterion.value else None
        except ValueError:
            val = None

        if val is None:
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="UNCLEAR",
                confidence=50.0,
                detail="Could not parse ECOG threshold",
            )

        op = criterion.operator or "<="
        passed = self._compare(ecog, op, val)
        return CriterionResult(
            criterion=criterion.text,
            type=criterion.type,
            category="hard",
            status="PASS" if passed else "FAIL",
            confidence=100.0,
            detail=f"Patient ECOG {ecog} {'meets' if passed else 'does not meet'} requirement ({op} {val})",
        )

    def _eval_stage(
        self, patient: PatientRecord, criterion: ParsedCriterion
    ) -> CriterionResult:
        """Evaluate cancer stage criterion."""
        patient_stage = (patient.diagnosis.stage or "").lower()
        required = (criterion.value or "").lower()

        if not patient_stage:
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="UNCLEAR",
                confidence=30.0,
                detail="Patient stage not available",
            )

        # Simple containment check for stage matching
        passed = required in patient_stage or patient_stage in required
        return CriterionResult(
            criterion=criterion.text,
            type=criterion.type,
            category="hard",
            status="PASS" if passed else "FAIL",
            confidence=85.0,
            detail=f"Patient stage '{patient.diagnosis.stage}' vs required '{criterion.value}'",
        )

    def _eval_lab(
        self, patient: PatientRecord, criterion: ParsedCriterion
    ) -> CriterionResult:
        """Evaluate lab value criterion."""
        if not patient.lab_values:
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="UNCLEAR",
                confidence=30.0,
                detail="Patient lab values not available",
            )

        field = (criterion.field or "").lower()
        lab_map = {
            "hemoglobin": patient.lab_values.hemoglobin,
            "wbc": patient.lab_values.wbc,
            "platelets": patient.lab_values.platelets,
            "creatinine": patient.lab_values.creatinine,
            "bilirubin": patient.lab_values.bilirubin,
            "alt": patient.lab_values.alt,
            "ast": patient.lab_values.ast,
        }

        patient_val = lab_map.get(field)
        if patient_val is None:
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="UNCLEAR",
                confidence=30.0,
                detail=f"Patient {field} value not available",
            )

        try:
            threshold = float(criterion.value) if criterion.value else None
        except ValueError:
            threshold = None

        if threshold is None:
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="UNCLEAR",
                confidence=50.0,
                detail=f"Could not parse {field} threshold",
            )

        op = criterion.operator or "<="
        passed = self._compare(patient_val, op, threshold)
        return CriterionResult(
            criterion=criterion.text,
            type=criterion.type,
            category="hard",
            status="PASS" if passed else "FAIL",
            confidence=100.0,
            detail=f"Patient {field}={patient_val} {'meets' if passed else 'does not meet'} ({op} {threshold})",
        )

    def _eval_from_text(
        self, patient: PatientRecord, criterion: ParsedCriterion
    ) -> CriterionResult:
        """Try to evaluate criterion by parsing its raw text."""
        text = criterion.text.lower()

        # Age patterns
        age_match = re.search(
            r"age\s*(?:[>=<]+|over|above|below|under|at least|no more than)\s*(\d+)",
            text,
        )
        if age_match:
            age_val = int(age_match.group(1))
            patient_age = patient.demographics.age
            if "over" in text or "above" in text or ">=" in text or "at least" in text:
                passed = patient_age >= age_val
                op_str = ">="
            elif (
                "under" in text
                or "below" in text
                or "<=" in text
                or "no more than" in text
            ):
                passed = patient_age <= age_val
                op_str = "<="
            elif ">" in text:
                passed = patient_age > age_val
                op_str = ">"
            elif "<" in text:
                passed = patient_age < age_val
                op_str = "<"
            else:
                passed = patient_age >= age_val
                op_str = ">="

            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="PASS" if passed else "FAIL",
                confidence=90.0,
                detail=f"Patient age {patient_age} {op_str} {age_val}: {'met' if passed else 'not met'}",
            )

        # Pregnancy exclusion
        if "pregnan" in text or "lactating" in text or "breastfeed" in text:
            patient_gender = patient.demographics.gender.lower()
            if patient_gender == "male":
                return CriterionResult(
                    criterion=criterion.text,
                    type=criterion.type,
                    category="hard",
                    status="PASS",
                    confidence=100.0,
                    detail="Patient is male, pregnancy exclusion not applicable",
                )
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="UNCLEAR",
                confidence=40.0,
                detail="Pregnancy status not available in patient record",
            )

        # ECOG patterns
        ecog_match = re.search(
            r"ecog\s*(?:ps|performance|status)?\s*(?:[<=]+)?\s*(\d)", text
        )
        if ecog_match and patient.ecog_status is not None:
            max_ecog = int(ecog_match.group(1))
            passed = patient.ecog_status <= max_ecog
            return CriterionResult(
                criterion=criterion.text,
                type=criterion.type,
                category="hard",
                status="PASS" if passed else "FAIL",
                confidence=95.0,
                detail=f"Patient ECOG {patient.ecog_status} <= {max_ecog}: {'met' if passed else 'not met'}",
            )

        # If we can't evaluate it as a hard rule, mark as semantic
        return CriterionResult(
            criterion=criterion.text,
            type=criterion.type,
            category="semantic",
            status="UNCLEAR",
            confidence=0.0,
            detail="Cannot evaluate as hard rule, requires semantic analysis",
        )

    @staticmethod
    def _compare(patient_val: float, operator: str, threshold: float) -> bool:
        """Compare a patient value against a threshold with the given operator."""
        ops = {
            ">=": lambda a, b: a >= b,
            ">": lambda a, b: a > b,
            "<=": lambda a, b: a <= b,
            "<": lambda a, b: a < b,
            "==": lambda a, b: a == b,
            "!=": lambda a, b: a != b,
            "=": lambda a, b: a == b,
        }
        fn = ops.get(operator, ops[">="])
        return fn(patient_val, threshold)
