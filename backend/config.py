"""
TrialMatch AI - Configuration
Centralized configuration for all paths, model names, and settings.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# ─── Paths ───────────────────────────────────────────────────────────────────
DATA_DIR = PROJECT_ROOT / "data"
TRIALS_PATH = DATA_DIR / "trials.json"
PATIENTS_PATH = DATA_DIR / "patients.json"

MODELS_DIR = PROJECT_ROOT / "models"
LORA_ADAPTER_PATH = MODELS_DIR / "trialmatch-7b-lora"

# ─── Model Names ─────────────────────────────────────────────────────────────
BASE_MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.3"
EMBEDDING_MODEL_NAME = "pritamdeka/S-PubMedBert-MS-MARCO"
NER_MODEL_NAME = "dslim/bert-base-NER"
SCISPACY_MODEL_NAME = "en_core_sci_md"

# ─── API Keys ─────────────────────────────────────────────────────────────────
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ─── Scoring Weights ─────────────────────────────────────────────────────────
SCORE_WEIGHT_RULE = 0.30
SCORE_WEIGHT_EMBEDDING = 0.20
SCORE_WEIGHT_LLM = 0.35
SCORE_WEIGHT_GEO = 0.15
EXCLUSION_PENALTY_FACTOR = 0.1

# ─── Server Settings ─────────────────────────────────────────────────────────
MAX_DISTANCE_KM = 500.0  # Max distance for geo scoring normalization
DEFAULT_PAGE_SIZE = 20

# ─── LLM Inference Settings ──────────────────────────────────────────────────
LLM_MAX_NEW_TOKENS = 512
LLM_TEMPERATURE = 0.1
LLM_TOP_P = 0.9

# ─── Mistral API Settings ────────────────────────────────────────────────────
MISTRAL_API_BASE = "https://api.mistral.ai/v1"
MISTRAL_API_MODEL = "mistral-large-latest"
