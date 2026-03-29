# TrialMatch AI - Clinical Trial Eligibility & Matching Engine

> Hackathon: Coherence 2026 | Track: Health & Digital Wellbeing

An AI-powered system that matches patients to clinical trials using NLP, semantic similarity, and fine-tuned LLMs.

## Features

- **Patient Anonymization** - SciSpacy NER to de-identify PHI
- **Semantic Trial Matching** - PubMedBERT embeddings + cosine similarity
- **LLM-based Eligibility Scoring** - Fine-tuned Mistral-7B for criteria evaluation
- **Rule-based Filters** - Age, gender, location hard constraints
- **Geo-distance Ranking** - Google Maps API for proximity scoring
- **Explainable Results** - PASS/FAIL breakdown per criterion

## Project Structure

```
Cogni-Stream/
├── backend/           # FastAPI backend
│   ├── main.py        # App entry point
│   ├── config.py      # Configuration
│   ├── schemas/       # Pydantic models
│   ├── engine/        # ML pipelines (NER, embedding, LLM, scorer)
│   ├── services/      # External APIs (Mistral, Geo)
│   └── routers/       # API endpoints
├── scripts/           # Data generation & training
├── data/              # Trials, patients, training data
├── models/            # Fine-tuned LoRA adapters (not tracked)
└── requirements.txt
```

## Setup

### 1. Create Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Download SciSpacy Model

```bash
pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.3/en_core_sci_md-0.5.3.tar.gz
```

### 3. Environment Variables

Create `.env` file:
```
MISTRAL_API_KEY=your_mistral_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 4. Run Server

```bash
# Fast mode (skip local LLM, use API fallback)
TRIALMATCH_SKIP_LLM=1 uvicorn backend.main:app --reload

# Full mode (requires GPU)
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System status |
| POST | `/api/anonymize` | De-identify patient record |
| GET | `/api/trials` | List trials with filters |
| POST | `/api/match` | Match patient to specific trials |
| POST | `/api/match-all` | Match patient to ALL trials |
| POST | `/api/parse-criteria` | Decompose eligibility criteria |

## Training (Optional)

```bash
python scripts/finetune.py
```

## License

MIT
