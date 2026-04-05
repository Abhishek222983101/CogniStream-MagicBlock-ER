"""
TrialMatch AI - FastAPI Backend
Main application entry point. Loads all ML models on startup,
wires up engines, and exposes API endpoints.

Run with:
    cd /home/arch-nitro/Cogni-Stream
    source /home/arch-nitro/MistralFluence/.venv/bin/activate
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
"""

import json
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import (
    TRIALS_PATH,
    PATIENTS_PATH,
    MISTRAL_API_KEY,
)
from backend.schemas.patient import PatientRecord
from backend.schemas.trial import ClinicalTrial
from backend.schemas.result import HealthResponse
from backend.engine.ner_anonymizer import NERAnonymizer
from backend.engine.embedding_matcher import EmbeddingMatcher
from backend.engine.llm_matcher import LLMMatcher
from backend.engine.rule_engine import RuleEngine
from backend.engine.criteria_parser import CriteriaParser
from backend.engine.scorer import CompositeScorer
from backend.services.mistral_client import MistralClient

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("trialmatch")

# ─── Global State ────────────────────────────────────────────────────────────
# These hold loaded models and data, accessed by routers via getter functions.
_anonymizer: Optional[NERAnonymizer] = None
_embedding_matcher: Optional[EmbeddingMatcher] = None
_llm_matcher: Optional[LLMMatcher] = None
_rule_engine: Optional[RuleEngine] = None
_criteria_parser: Optional[CriteriaParser] = None
_scorer: Optional[CompositeScorer] = None
_mistral_client: Optional[MistralClient] = None

_trials_raw: list[dict] = []
_trials_objects: list[ClinicalTrial] = []
_patients_raw: list[dict] = []
_patients_map: dict[str, PatientRecord] = {}


# ─── Getter Functions (used by routers) ──────────────────────────────────────
def get_anonymizer() -> Optional[NERAnonymizer]:
    return _anonymizer


def get_scorer() -> Optional[CompositeScorer]:
    return _scorer


def get_criteria_parser() -> Optional[CriteriaParser]:
    return _criteria_parser


def get_trials_data() -> list[dict]:
    return _trials_raw


def get_trial_objects(trial_ids: list[str]) -> list[ClinicalTrial]:
    return [t for t in _trials_objects if t.trial_id in trial_ids]


def get_all_trial_objects() -> list[ClinicalTrial]:
    return _trials_objects


def get_patient(patient_id: str) -> Optional[PatientRecord]:
    return _patients_map.get(patient_id)


def get_mistral_client() -> Optional[MistralClient]:
    return _mistral_client


# ─── Data Loading ────────────────────────────────────────────────────────────
def _load_data():
    """Load trials and patients from JSON files."""
    global _trials_raw, _trials_objects, _patients_raw, _patients_map

    # Load trials
    if TRIALS_PATH.exists():
        with open(TRIALS_PATH, "r", encoding="utf-8") as f:
            _trials_raw = json.load(f)
        logger.info(f"Loaded {len(_trials_raw)} trials from {TRIALS_PATH}")

        for t in _trials_raw:
            try:
                _trials_objects.append(ClinicalTrial(**t))
            except Exception as e:
                logger.warning(f"Skipping trial {t.get('trial_id', '?')}: {e}")
        logger.info(f"Parsed {len(_trials_objects)} trial objects")
    else:
        logger.warning(f"Trials file not found: {TRIALS_PATH}")

    # Load patients
    if PATIENTS_PATH.exists():
        with open(PATIENTS_PATH, "r", encoding="utf-8") as f:
            _patients_raw = json.load(f)
        logger.info(f"Loaded {len(_patients_raw)} patients from {PATIENTS_PATH}")

        for p in _patients_raw:
            try:
                patient = PatientRecord(**p)
                _patients_map[patient.patient_id] = patient
            except Exception as e:
                logger.warning(f"Skipping patient {p.get('patient_id', '?')}: {e}")
        logger.info(f"Parsed {len(_patients_map)} patient objects")
    else:
        logger.warning(f"Patients file not found: {PATIENTS_PATH}")


# ─── Model Loading ───────────────────────────────────────────────────────────
def _load_models(skip_llm: bool = False):
    """Load all ML models. Called during app startup."""
    global _anonymizer, _embedding_matcher, _llm_matcher
    global _rule_engine, _criteria_parser, _scorer, _mistral_client

    # 1. NER Anonymizer (CPU, fast)
    logger.info("Loading NER Anonymizer...")
    _anonymizer = NERAnonymizer()
    _anonymizer.load()

    # 2. Embedding Matcher (CPU)
    logger.info("Loading Embedding Matcher...")
    _embedding_matcher = EmbeddingMatcher()
    _embedding_matcher.load()

    # 3. Rule Engine (no model needed)
    _rule_engine = RuleEngine()
    logger.info("Rule Engine initialized.")

    # 4. Criteria Parser (no model needed for pattern-based)
    _criteria_parser = CriteriaParser()
    logger.info("Criteria Parser initialized.")

    # 5. Mistral API Client
    if MISTRAL_API_KEY:
        _mistral_client = MistralClient(api_key=MISTRAL_API_KEY)
        _criteria_parser.set_mistral_client(_mistral_client)
        logger.info("Mistral API client initialized.")
    else:
        logger.warning("MISTRAL_API_KEY not set, API fallback unavailable.")

    # 6. LLM Matcher (GPU, heavy - optional)
    _llm_matcher = LLMMatcher()
    if _mistral_client:
        _llm_matcher.set_mistral_client(_mistral_client)

    if not skip_llm:
        logger.info("Loading LLM Matcher (this may take a minute)...")
        _llm_matcher.load()
    else:
        logger.info("Skipping local LLM loading (API fallback will be used).")

    # 7. Composite Scorer (orchestrator)
    _scorer = CompositeScorer(
        rule_engine=_rule_engine,
        embedding_matcher=_embedding_matcher,
        criteria_parser=_criteria_parser,
        llm_matcher=_llm_matcher,
    )
    logger.info("Composite Scorer initialized.")


# ─── App Lifecycle ───────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: load models on startup, cleanup on shutdown."""
    import os

    logger.info("=" * 60)
    logger.info("TrialMatch AI Backend - Starting up")
    logger.info("=" * 60)

    # Check if we should skip local LLM (e.g., for testing without GPU)
    skip_llm = os.environ.get("TRIALMATCH_SKIP_LLM", "").lower() in ("1", "true", "yes")

    _load_data()
    _load_models(skip_llm=skip_llm)

    logger.info("=" * 60)
    logger.info("TrialMatch AI Backend - Ready!")
    logger.info(f"Trials loaded: {len(_trials_objects)}")
    logger.info(f"Patients loaded: {len(_patients_map)}")
    logger.info(
        f"NER Anonymizer: {'Ready' if _anonymizer and _anonymizer.is_loaded else 'Unavailable'}"
    )
    logger.info(
        f"Embedding Matcher: {'Ready' if _embedding_matcher and _embedding_matcher.is_loaded else 'Unavailable'}"
    )
    logger.info(
        f"LLM Matcher (local): {'Ready' if _llm_matcher and _llm_matcher.is_local_loaded else 'API fallback'}"
    )
    logger.info(f"Mistral API: {'Ready' if _mistral_client else 'Unavailable'}")
    logger.info("=" * 60)

    yield

    # Shutdown
    logger.info("Shutting down TrialMatch AI Backend...")
    if _llm_matcher:
        _llm_matcher.unload()
    if _mistral_client:
        await _mistral_client.close()
    logger.info("Shutdown complete.")


# ─── FastAPI App ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="TrialMatch AI",
    description="Clinical Trial Eligibility & Matching Engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow all origins for hackathon (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ───────────────────────────────────────────────────────
from backend.routers import anonymize, trials, match, parse, ingest, patients, tee_auth

app.include_router(anonymize.router, tags=["Anonymize"])
app.include_router(trials.router, tags=["Trials"])
app.include_router(match.router, tags=["Match"])
app.include_router(parse.router, tags=["Parse"])
app.include_router(ingest.router, tags=["Ingest"])
app.include_router(patients.router, tags=["Patients"])
app.include_router(tee_auth.router, tags=["TEE Auth"])


# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """System health check - model status, GPU availability."""
    import torch

    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else None
    gpu_memory = (
        round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1)
        if gpu_available
        else None
    )

    return HealthResponse(
        status="ok",
        models_loaded={
            "ner_anonymizer": _anonymizer.is_loaded if _anonymizer else False,
            "embedding_matcher": _embedding_matcher.is_loaded
            if _embedding_matcher
            else False,
            "llm_matcher_local": _llm_matcher.is_local_loaded
            if _llm_matcher
            else False,
            "llm_matcher_api": _mistral_client is not None,
            "trials_count": len(_trials_objects),
            "patients_count": len(_patients_map),
        },
        gpu_available=gpu_available,
        gpu_name=gpu_name,
        gpu_memory_gb=gpu_memory,
    )
