"""
Composite Scorer - Combines rule engine, embedding, LLM, and geo scores.

Scoring formula:
  composite = 0.30*rule + 0.20*embedding + 0.35*llm + 0.15*geo
  if exclusion_failed: composite *= 0.1 (hard penalty)
  if condition_mismatch: composite *= 0.3 (cancer type mismatch penalty)
"""

import logging
from typing import Optional

from backend.schemas.patient import PatientRecord
from backend.schemas.trial import ClinicalTrial, ParsedCriterion
from backend.schemas.result import (
    MatchResult,
    CriterionResult,
    ScoreBreakdown,
    MatchResponse,
)
from backend.engine.rule_engine import RuleEngine
from backend.engine.embedding_matcher import EmbeddingMatcher
from backend.engine.criteria_parser import CriteriaParser
from backend.services.geo import calculate_distance, geo_score
from backend.config import (
    SCORE_WEIGHT_RULE,
    SCORE_WEIGHT_EMBEDDING,
    SCORE_WEIGHT_LLM,
    SCORE_WEIGHT_GEO,
    EXCLUSION_PENALTY_FACTOR,
    MAX_DISTANCE_KM,
)

logger = logging.getLogger(__name__)

# Condition matching keywords for cancer type validation
CONDITION_KEYWORDS = {
    "lung": [
        "lung",
        "nsclc",
        "sclc",
        "non-small cell",
        "small cell lung",
        "pulmonary",
        "bronchogenic",
    ],
    "colorectal": ["colorectal", "colon", "rectal", "crc", "bowel"],
    "breast": [
        "breast",
        "mammary",
        "her2",
        "her2+",
        "her2-positive",
        "triple negative",
        "tnbc",
    ],
    "prostate": ["prostate", "prostatic"],
    "pancreatic": ["pancreas", "pancreatic"],
    "liver": ["liver", "hepatic", "hepatocellular", "hcc"],
    "gastric": ["gastric", "stomach"],
    "ovarian": ["ovarian", "ovary"],
    "melanoma": ["melanoma", "skin cancer"],
    "leukemia": ["leukemia", "aml", "all", "cml", "cll"],
    "lymphoma": ["lymphoma", "hodgkin", "non-hodgkin"],
    "kidney": ["kidney", "renal", "rcc"],
    "bladder": ["bladder", "urothelial"],
    "esophageal": ["esophageal", "esophagus"],
    "head_neck": ["head and neck", "oral", "pharyngeal", "laryngeal"],
    # CRITICAL FIX: Cervical cancer was missing - this caused NCT07290972 to match NSCLC patients
    "cervical": ["cervical", "cervix", "cervical cancer"],
    # Additional cancer types for completeness
    "thyroid": ["thyroid", "papillary thyroid", "medullary thyroid"],
    "brain": ["brain", "glioblastoma", "glioma", "gbm", "astrocytoma", "meningioma"],
    "myeloma": ["myeloma", "multiple myeloma", "plasmacytoma"],
}


def _detect_condition_type(text: str) -> set[str]:
    """Detect cancer type(s) from text using keyword matching."""
    text_lower = text.lower()
    detected = set()
    for condition_type, keywords in CONDITION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                detected.add(condition_type)
                break
    return detected


def _conditions_match(patient_conditions: set[str], trial_conditions: set[str]) -> bool:
    """Check if patient and trial conditions have overlap."""
    if not patient_conditions or not trial_conditions:
        return True  # Can't determine, assume match
    return bool(patient_conditions & trial_conditions)


class CompositeScorer:
    """Orchestrates all matching engines and produces ranked results."""

    def __init__(
        self,
        rule_engine: RuleEngine,
        embedding_matcher: EmbeddingMatcher,
        criteria_parser: CriteriaParser,
        llm_matcher=None,
    ):
        self.rule_engine = rule_engine
        self.embedding_matcher = embedding_matcher
        self.criteria_parser = criteria_parser
        self.llm_matcher = llm_matcher

    async def score_patient_trial(
        self,
        patient: PatientRecord,
        trial: ClinicalTrial,
        skip_llm: bool = False,
        skip_embeddings: bool = False,
    ) -> MatchResult:
        """Score a single patient-trial pair using all engines."""

        all_criteria_results: list[CriterionResult] = []
        exclusion_triggered = False

        # ─── 1. Parse criteria if not already parsed ─────────────────────
        if not trial.parsed_inclusion and not trial.parsed_exclusion:
            inc, exc = self.criteria_parser.parse_criteria(
                trial.inclusion_criteria_raw,
                trial.exclusion_criteria_raw,
            )
            trial.parsed_inclusion = inc
            trial.parsed_exclusion = exc

        # ─── 2. Evaluate hard criteria via Rule Engine ───────────────────
        # Age range from trial metadata
        if trial.age_range:
            age_result = self.rule_engine.evaluate_age_range(
                patient, trial.age_range.min_years(), trial.age_range.max_years()
            )
            all_criteria_results.append(age_result)

        # Gender from trial metadata
        gender_result = self.rule_engine.evaluate_gender(patient, trial.gender)
        if gender_result:
            all_criteria_results.append(gender_result)

        # Parsed hard inclusion criteria
        for criterion in trial.parsed_inclusion:
            if criterion.category == "hard":
                result = self.rule_engine.evaluate_criterion(patient, criterion)
                # If rule engine couldn't handle it, mark as semantic
                if result.status == "UNCLEAR" and result.category == "semantic":
                    criterion.category = "semantic"
                else:
                    all_criteria_results.append(result)

        # Parsed hard exclusion criteria
        for criterion in trial.parsed_exclusion:
            if criterion.category == "hard":
                result = self.rule_engine.evaluate_criterion(patient, criterion)
                if result.status == "PASS" and criterion.type == "exclusion":
                    # For exclusion criteria, "PASS" means the exclusion condition IS met
                    # which means patient should be EXCLUDED
                    result.status = "FAIL"
                    result.detail = (
                        result.detail or ""
                    ) + " (exclusion criterion met - patient excluded)"
                    exclusion_triggered = True
                elif result.status == "FAIL" and criterion.type == "exclusion":
                    # Exclusion condition NOT met = good for patient
                    result.status = "PASS"
                    result.detail = (
                        result.detail or ""
                    ) + " (exclusion criterion not met - patient OK)"
                all_criteria_results.append(result)

        # ─── 3. Calculate Rule Score ─────────────────────────────────────
        hard_results = [r for r in all_criteria_results if r.category == "hard"]
        if hard_results:
            passed_hard = sum(1 for r in hard_results if r.status == "PASS")
            rule_score = (passed_hard / len(hard_results)) * 100
        else:
            rule_score = 50.0  # Neutral if no hard criteria

        # ─── 4. Embedding Similarity ─────────────────────────────────────
        patient_text = patient.to_summary_text()

        # Get semantic criteria texts
        semantic_criteria = [
            c
            for c in (trial.parsed_inclusion + trial.parsed_exclusion)
            if c.category == "semantic"
        ]

        embedding_score = 50.0

        if (
            not skip_embeddings
            and semantic_criteria
            and self.embedding_matcher.is_loaded
        ):
            criteria_texts = [c.text for c in semantic_criteria]
            similarities = self.embedding_matcher.batch_match_criteria(
                patient_text, criteria_texts
            )
            embedding_score = (sum(similarities) / len(similarities)) * 100

            # Add semantic results from embedding
            for criterion, sim in zip(semantic_criteria, similarities):
                sim_pct = sim * 100
                status = (
                    "PASS"
                    if sim_pct >= 50
                    else ("UNCLEAR" if sim_pct >= 30 else "FAIL")
                )
                all_criteria_results.append(
                    CriterionResult(
                        criterion=criterion.text,
                        type=criterion.type,
                        category="semantic",
                        status=status,
                        confidence=round(sim_pct, 1),
                        detail=f"Embedding similarity: {sim_pct:.1f}%",
                    )
                )
        elif not skip_embeddings and not semantic_criteria:
            # If no semantic criteria, use overall trial-patient similarity
            trial_text = trial.get_criteria_text()
            if trial_text and self.embedding_matcher.is_loaded:
                sim = self.embedding_matcher.match_trial(patient_text, trial_text)
                embedding_score = sim * 100
            else:
                embedding_score = 50.0

        # ─── 5. LLM Matching ────────────────────────────────────────────
        llm_score = 50.0  # Default neutral

        if not skip_llm and self.llm_matcher and self.llm_matcher.is_available:
            llm_scores = []
            # Only run LLM on semantic criteria to save compute
            semantic_for_llm = semantic_criteria[
                :3
            ]  # Limit to 3 criteria max per trial

            for criterion in semantic_for_llm:
                try:
                    llm_result = await self.llm_matcher.match_criterion(
                        patient_text, criterion.text, criterion.type
                    )
                    raw_conf = llm_result.get("confidence", 50)
                    status_str = llm_result.get("status", "UNCLEAR")

                    # Calculate score and determine PASS/FAIL status
                    if criterion.type == "inclusion":
                        if status_str == "ELIGIBLE":
                            conf_score = raw_conf
                            cr_status = "PASS"
                        elif status_str == "INELIGIBLE":
                            conf_score = 100 - raw_conf
                            cr_status = "FAIL"
                        else:
                            conf_score = 50.0
                            cr_status = "UNCLEAR"
                    else:  # exclusion
                        if status_str == "ELIGIBLE":
                            conf_score = 100 - raw_conf
                            cr_status = "FAIL"
                            exclusion_triggered = True
                        elif status_str == "INELIGIBLE":
                            conf_score = raw_conf
                            cr_status = "PASS"
                        else:
                            conf_score = 50.0
                            cr_status = "UNCLEAR"

                    llm_scores.append(conf_score)

                    # Update criteria result with LLM reasoning and final status
                    for cr in all_criteria_results:
                        if cr.criterion == criterion.text and cr.category == "semantic":
                            cr.reasoning = llm_result.get("reasoning", "")
                            cr.confidence = conf_score
                            cr.status = cr_status
                            break

                except Exception as e:
                    logger.warning(f"LLM match failed for criterion: {e}")
                    llm_scores.append(50.0)

            if llm_scores:
                llm_score = sum(llm_scores) / len(llm_scores)

        # ─── 6. Geographic Score ─────────────────────────────────────────
        # Find closest trial location to patient
        best_distance = None
        best_location = None

        for loc in trial.locations:
            dist = calculate_distance(
                patient.demographics.lat,
                patient.demographics.lng,
                patient.demographics.city,
                loc.lat,
                loc.lng,
                loc.city,
            )
            if dist is not None and (best_distance is None or dist < best_distance):
                best_distance = dist
                best_location = {
                    "facility": loc.facility,
                    "city": loc.city,
                    "state": loc.state,
                }

        geographic_score = geo_score(best_distance, MAX_DISTANCE_KM)

        # ─── 7. Condition Match Check (Cancer Type) ───────────────────────
        # CRITICAL: Penalize heavily if patient's cancer type doesn't match trial's condition
        # E.g., NSCLC patient should NOT match Colorectal Cancer trial
        condition_mismatch = False

        # Build condition text from patient
        patient_condition_text = (
            f"{patient.diagnosis.primary or ''} {patient.diagnosis.subtype or ''}"
        )
        if patient.clinical_notes:
            patient_condition_text += f" {patient.clinical_notes}"

        # Build condition text from trial
        trial_condition_text = " ".join(trial.conditions or [])
        if trial.title:
            trial_condition_text += f" {trial.title}"

        # Detect condition types
        patient_conditions = _detect_condition_type(patient_condition_text)
        trial_conditions = _detect_condition_type(trial_condition_text)

        # Check if conditions match
        if patient_conditions and trial_conditions:
            if not _conditions_match(patient_conditions, trial_conditions):
                condition_mismatch = True
                # Add a criteria result explaining the mismatch
                all_criteria_results.append(
                    CriterionResult(
                        criterion="Primary Condition Match",
                        type="inclusion",
                        category="hard",
                        status="FAIL",
                        confidence=100.0,
                        detail=f"Patient has {', '.join(patient_conditions)} but trial is for {', '.join(trial_conditions)}",
                    )
                )

        # ─── 8. Composite Score ──────────────────────────────────────────
        composite = (
            SCORE_WEIGHT_RULE * rule_score
            + SCORE_WEIGHT_EMBEDDING * embedding_score
            + SCORE_WEIGHT_LLM * llm_score
            + SCORE_WEIGHT_GEO * geographic_score
        )

        if exclusion_triggered:
            composite *= EXCLUSION_PENALTY_FACTOR

        # Heavy penalty for condition mismatch (e.g., lung cancer patient matching colon cancer trial)
        if condition_mismatch:
            composite *= 0.3  # 70% penalty for wrong cancer type

        composite = round(max(0, min(100, composite)), 2)

        return MatchResult(
            trial_id=trial.trial_id,
            trial_title=trial.title,
            composite_score=composite,
            location=best_location,
            distance_km=best_distance,
            criteria_results=all_criteria_results,
            score_breakdown=ScoreBreakdown(
                rule_engine=round(rule_score, 2),
                embedding_similarity=round(embedding_score, 2),
                llm_confidence=round(llm_score, 2),
                geographic=round(geographic_score, 2),
            ),
            exclusion_triggered=exclusion_triggered,
        )

    async def match_patient_to_trials(
        self,
        patient: PatientRecord,
        trials: list[ClinicalTrial],
        top_k_for_embed: int = 10,
        top_k_for_llm: int = 3,
    ) -> MatchResponse:
        """
        3-Stage Enterprise Retrieval Funnel:
        1. Fast Rule & Geo Filtering (97 trials -> Top 10)
        2. Real PubMedBERT Vector Search (Top 10 -> Top 3)
        3. Deep Mistral LLM Reranking (Top 3)
        """
        # ─── PASS 1: Fast Rule + Geo Filtering (Instant, skips ML) ────────────
        pass1_results = []
        for trial in trials:
            try:
                result = await self.score_patient_trial(
                    patient, trial, skip_llm=True, skip_embeddings=True
                )
                pass1_results.append((trial, result))
            except Exception as e:
                logger.error(f"Error in rule scoring trial {trial.trial_id}: {e}")
                continue

        # Sort by initial scores (mostly Rule + Geo)
        pass1_results.sort(key=lambda x: x[1].composite_score, reverse=True)

        # ─── PASS 2: Real Vector Search (Top K) ───────────────────────────────
        pass2_results = []
        for i, (trial, _) in enumerate(pass1_results):
            if i < top_k_for_embed:
                # Run actual PubMedBERT model on these 10 trials
                try:
                    embed_result = await self.score_patient_trial(
                        patient, trial, skip_llm=True, skip_embeddings=False
                    )
                    pass2_results.append((trial, embed_result))
                except Exception as e:
                    logger.error(f"Error in embedding scoring {trial.trial_id}: {e}")
                    pass2_results.append((trial, _))
            else:
                pass2_results.append((trial, _))

        # Re-sort after vector search bumps up the best semantic matches
        pass2_results.sort(key=lambda x: x[1].composite_score, reverse=True)

        # ─── PASS 3: Deep LLM Reasoning (Top 3) ───────────────────────────────
        final_results = []
        for i, (trial, embed_result) in enumerate(pass2_results):
            if i < top_k_for_llm:
                # Run Mistral API on the very best matches to finalize logic
                try:
                    llm_result = await self.score_patient_trial(
                        patient, trial, skip_llm=False, skip_embeddings=False
                    )
                    final_results.append(llm_result)
                except Exception as e:
                    logger.error(f"Error in deep scoring trial {trial.trial_id}: {e}")
                    final_results.append(embed_result)
            else:
                final_results.append(embed_result)

        # Final sort after LLM adjustments
        final_results.sort(key=lambda r: r.composite_score, reverse=True)

        # Assign ranks
        for i, result in enumerate(final_results):
            result.rank = i + 1

        return MatchResponse(
            patient_id=patient.patient_id,
            patient_summary=patient.to_summary_text(),
            total_trials_screened=len(trials),
            matches=final_results,
        )
