# CogniStream — Privacy-First Clinical Trial Matching on Solana

<div align="center">

![CogniStream Banner](https://img.shields.io/badge/MagicBlock-Ephemeral_Rollups-purple?style=for-the-badge&logo=solana)
![Solana](https://img.shields.io/badge/Solana-Devnet-14F195?style=for-the-badge&logo=solana)
![Reclaim](https://img.shields.io/badge/Reclaim-ZK_TLS-00D4AA?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live_Demo-success?style=for-the-badge)

**CogniStream** is a privacy-first clinical trial matching platform that leverages **MagicBlock Ephemeral Rollups (ER)** for gasless, sub-second on-chain transactions, **Reclaim Protocol ZK-TLS** for cryptographic patient data verification, and a multi-stage **AI/ML pipeline** (BERT NER, PubMedBERT, Mistral-7B) for intelligent trial matching.

[Live Demo](#demo-video) | [Architecture](#architecture) | [MagicBlock Integration](#magicblock-ephemeral-rollups-integration) | [Setup Guide](#quick-start)

</div>

---

## Problem Statement

Clinical trial recruitment is broken:
- **80% of trials** fail to meet enrollment deadlines
- **Patients wait 6+ weeks** to find matching trials manually
- **Privacy concerns** prevent patients from sharing sensitive health data
- **No audit trail** for consent management (HIPAA compliance nightmare)

## Our Solution

CogniStream solves this with a 3-layer approach:

| Layer | Technology | Purpose |
|-------|------------|---------|
| **AI Matching** | BERT NER + PubMedBERT + Mistral-7B | Analyze patient records against 100+ trials in seconds |
| **ZK Verification** | Reclaim Protocol ZK-TLS | Cryptographically prove patient data authenticity without exposing credentials |
| **On-Chain Consent** | MagicBlock Ephemeral Rollups | Gasless, sub-second immutable consent logs on Solana |

---

## Demo Video

<!-- Add your demo video link here -->
**[Watch the Full Demo (3 minutes)](#)** — Coming soon

### Test the Full Flow Yourself

1. Open `http://localhost:3000` (or deployed link)
2. Navigate to **Dashboard** → **Pipeline**
3. Connect **Phantom Wallet** (Devnet)
4. Click **"Use Sample"** to load Arjun Mehta's patient data
5. Click **"Start Verification & Processing"**
6. Approve Phantom transactions (you'll see 3 popups since ER is gasless)
7. Click **"View Full Results"** when complete
8. Check the **ZK Verified** badge and **On-Chain Proof** links
9. Click **"Log Consent"** → Voice page → Say **"I want to participate"**

### Demo Flow

1. **ZK Verification** (0:00-0:30): Connect wallet, verify patient data via Reclaim Protocol
2. **ML Pipeline** (0:30-1:30): Watch AI analyze patient against 97 trials
3. **ER Transactions** (1:30-2:15): See 4 gasless Solana transactions execute
4. **Voice Consent** (2:15-3:00): Say "I want to participate" to log consent on-chain

---

## On-Chain Program

| Field | Value |
|-------|-------|
| **Program Name** | `cognistream` |
| **Program ID** | `3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg` |
| **Network** | Solana Devnet |
| **Framework** | Anchor 0.32.1 |
| **IDL** | [`target/idl/cognistream.json`](./target/idl/cognistream.json) |

**Solana Explorer Links:**
- [Program Account (Devnet)](https://explorer.solana.com/address/3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg?cluster=devnet)
- [Example Patient Init Transaction](https://solscan.io/tx/3FdMYohGnc6C35R6KZgAx3j1tihHRsYFsPvE2FeKYKmVMHRC1usxj66BHdHSzP7jgqePkwPT3hntsBoSVbzDG2xr?cluster=devnet)
- [Example Match Record Transaction](https://solscan.io/tx/2G3Kik9Cj48sgduQCVLnvNUAhmXVpvEVNP6jfoYHkfAC9ES7QdY1dKLSTxbhYrQi1127n55itkb4Fn2Jhq6J8r4i?cluster=devnet)
- [Example Consent Log Transaction](https://solscan.io/tx/khTberbArm3mfpCCZtF1FcFxKkmoG2nB7Ft3EZyZ3bvvKTa3RqNVUWs4cWiLPP7bAjiXC3bG69dwnTfABsCvcbs?cluster=devnet)

---

## MagicBlock Ephemeral Rollups Integration

This is the core Web3 integration for the hackathon. We use MagicBlock's Ephemeral Rollups to achieve **gasless, sub-second transactions** for healthcare consent management.

### Why Ephemeral Rollups for Healthcare?

| Requirement | Traditional Solana | MagicBlock ER | CogniStream Implementation |
|-------------|-------------------|---------------|---------------------------|
| **Speed** | 400ms+ | <50ms | Real-time match recording |
| **Cost** | ~0.000005 SOL/tx | Gasless | Free consent logging |
| **Privacy** | Public mempool | TEE-protected | Patient data never exposed |
| **Compliance** | Manual audit | Immutable logs | HIPAA-ready timestamps |

### ER Transaction Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CogniStream ER Transaction Pipeline                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Step 1: initPatient (L1)                                              │
│   ┌──────────────────┐     Creates PatientRecord PDA with               │
│   │  Solana Devnet   │ ──► SHA-256 hash of anonymized patient data     │
│   │       (L1)       │     Tx: 3FdMYohG...VbzDG2xr                      │
│   └────────┬─────────┘                                                  │
│            │                                                             │
│            ▼                                                             │
│   Step 2: delegatePatient (L1 → ER)                                     │
│   ┌──────────────────┐     Delegates account ownership to               │
│   │  MagicBlock ER   │ ──► TEE validator for gasless operations        │
│   │  (TEE Protected) │     Validator: FnE6VJT...CCzk57                  │
│   └────────┬─────────┘                                                  │
│            │                                                             │
│            ▼                                                             │
│   Step 3: recordMatch (ER - GASLESS)                                    │
│   ┌──────────────────┐     Records ML match result with                 │
│   │  Ephemeral State │ ──► trial_id, score_bps, result_hash            │
│   │   (Sub-50ms)     │     Tx: 2G3Kik9C...hq6J8r4i                      │
│   └────────┬─────────┘                                                  │
│            │                                                             │
│            ▼                                                             │
│   Step 4: logConsent (ER - GASLESS)                                     │
│   ┌──────────────────┐     Creates immutable ConsentLog PDA             │
│   │  Immutable Audit │ ──► consent_type, timestamp, trial_id           │
│   │      Trail       │     Tx: khTberbA...ABsCvcbs                      │
│   └──────────────────┘                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Program Instructions

| Instruction | Purpose | ER Feature Used | Code Reference |
|-------------|---------|-----------------|----------------|
| `initPatient` | Create patient PDA with health data hash | L1 anchor point | [`lib.rs:42-62`](./programs/cognistream/src/lib.rs#L42) |
| `delegatePatient` | Delegate to ER validator via CPI | Account delegation | [`lib.rs:68-131`](./programs/cognistream/src/lib.rs#L68) |
| `recordMatch` | Log ML matching result (gasless on ER) | Gasless execution | [`lib.rs:151-174`](./programs/cognistream/src/lib.rs#L151) |
| `logConsent` | Create immutable consent record | Gasless + TEE | [`lib.rs:182-200`](./programs/cognistream/src/lib.rs#L182) |
| `revokeConsent` | Revoke previously granted consent | State mutation | [`lib.rs:203-212`](./programs/cognistream/src/lib.rs#L203) |
| `undelegatePatient` | Return account to L1 | Settlement | [`lib.rs:136-143`](./programs/cognistream/src/lib.rs#L136) |

### PDA Seeds (On-Chain Account Derivation)

| Account | Seeds | Purpose |
|---------|-------|---------|
| `PatientRecord` | `["patient", owner, patient_id]` | Stores hashed patient data |
| `MatchResult` | `["match", patient_pda, trial_id]` | Stores ML match scores |
| `ConsentLog` | `["consent", patient_pda, trial_id]` | Immutable consent audit |
| `DelegationBuffer` | `["buffer", patient_pda]` | MagicBlock delegation state |
| `DelegationRecord` | `["delegation", patient_pda]` | ER validator assignment |

### MagicBlock Endpoints Used

```typescript
// Frontend: src/components/WalletProvider.tsx
const ENDPOINTS = {
  ROUTER: "https://devnet-router.magicblock.app",      // Auto-routes L1 ↔ ER
  ER: "https://devnet-us.magicblock.app",              // US Ephemeral Rollup
  TEE: "https://devnet-tee.magicblock.app",            // TEE-protected ER
  L1: "https://api.devnet.solana.com",                 // Base layer
};

const VALIDATORS = {
  ER_US: "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd",
  TEE: "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA",   // Used for privacy mode
};
```

### Frontend ER Client Implementation

The complete ER client is in [`frontend/src/lib/er-client.ts`](./frontend/src/lib/er-client.ts):

```typescript
// Key methods:
class ERClient {
  // Initialize patient on L1 (required before delegation)
  async initPatient(params: InitPatientParams): Promise<TransactionResult>
  
  // Delegate to MagicBlock ER for gasless operations
  async delegatePatient(params: DelegatePatientParams): Promise<TransactionResult>
  
  // Record match result (gasless when delegated)
  async recordMatch(params: RecordMatchParams, isDelegated: boolean): Promise<TransactionResult>
  
  // Log consent (gasless when delegated)
  async logConsent(params: LogConsentParams, isDelegated: boolean): Promise<TransactionResult>
}
```

---

## Reclaim Protocol ZK-TLS Integration

We use Reclaim Protocol to cryptographically verify that patient data originated from a legitimate healthcare provider (e.g., Apollo Patient Portal) **without exposing login credentials**.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ZK-TLS Verification Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. Patient logs into Apollo Portal (in browser)                       │
│                        │                                                 │
│                        ▼                                                 │
│   2. Reclaim SDK intercepts TLS session data                            │
│                        │                                                 │
│                        ▼                                                 │
│   3. ZK Circuit generates proof of data authenticity                    │
│      - Proves: "This data came from api.apollo.com"                     │
│      - Without revealing: Login credentials, session tokens             │
│                        │                                                 │
│                        ▼                                                 │
│   4. Proof verified locally, hash stored in sessionStorage              │
│      - proofHash: 0x4fbef8d0b962d812c473d3a9dc44f568...                 │
│      - confidence: 98%                                                   │
│                        │                                                 │
│                        ▼                                                 │
│   5. "ZK Verified" badge displayed + Raw Proof Modal                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### ZK Proof Structure (View Raw Proof Modal)

```json
{
  "identifier": "0x4fbef8d0b962d812c473d3a9dc44f568427adb8f7f4028383ed5ceb49ba27706",
  "claimData": {
    "provider": "APOLLO",
    "parameters": "{\"url\":\"https://api.apollo.com/patient/data\"}",
    "owner": "0x4b70...",
    "timestampS": 1775506338,
    "context": "{\"contextAddress\":\"user's wallet\",\"contextMessage\":\"CogniStream Verification\"}"
  },
  "signatures": [
    "0x2b8c9d1a3e5f7b8c9d1a3e5f7b8c9d1a3e5f7b8c..."
  ],
  "witnesses": [
    { "id": "0x123...", "url": "https://witness.reclaimprotocol.org" }
  ],
  "publicData": {
    "extractedParameters": {
      "name": "Arjun Mehta",
      "diagnosis": "Non-Small Cell Lung Cancer",
      "stage": "Stage IV"
    }
  }
}
```

### Code Reference

- ZK Client: [`frontend/src/lib/reclaim-client.ts`](./frontend/src/lib/reclaim-client.ts)
- Raw Proof Modal: [`frontend/src/app/results/page.tsx`](./frontend/src/app/results/page.tsx) (line 860+)

---

## AI/ML Matching Pipeline

Our multi-stage ML pipeline processes patient data against 100+ clinical trials:

### Pipeline Stages

| Stage | Model/Algorithm | Purpose | Weight |
|-------|-----------------|---------|--------|
| **1. NER Anonymization** | BERT-based NER (SciSpacy) | Strip PII (names, addresses, phone numbers) | N/A |
| **2. Rule Engine** | Deterministic rules | Hard criteria (age, gender, stage, ECOG) | 30% |
| **3. Embedding Matcher** | PubMedBERT | Semantic similarity between patient & trial text | 20% |
| **4. LLM Reasoning** | Mistral-7B (via API) | Deep eligibility reasoning with explanations | 35% |
| **5. Geographic Scorer** | Haversine distance | Proximity to trial sites | 15% |

### Composite Score Formula

```
composite_score = (
    rule_engine_score * 0.30 +
    embedding_similarity * 0.20 +
    llm_confidence * 0.35 +
    geographic_score * 0.15
)
```

### Code Reference

- Main Engine: [`backend/engine/main.py`](./backend/engine/main.py)
- Embedding Matcher: [`backend/engine/embedding_matcher.py`](./backend/engine/embedding_matcher.py)
- LLM Matcher: [`backend/engine/llm_matcher.py`](./backend/engine/llm_matcher.py)
- Rule Engine: [`backend/engine/rule_engine.py`](./backend/engine/rule_engine.py)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CogniStream Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                         FRONTEND (Next.js 16)                          │ │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│   │  │  Pipeline   │  │   Results   │  │    Voice    │  │  Dashboard  │   │ │
│   │  │    Page     │  │    Page     │  │  Assistant  │  │             │   │ │
│   │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘   │ │
│   │         │                │                │                            │ │
│   │         └────────────────┼────────────────┘                            │ │
│   │                          │                                             │ │
│   │  ┌───────────────────────┴───────────────────────┐                     │ │
│   │  │              Shared Libraries                  │                     │ │
│   │  │  er-client.ts │ reclaim-client.ts │ pdas.ts   │                     │ │
│   │  └───────────────────────┬───────────────────────┘                     │ │
│   └──────────────────────────┼──────────────────────────────────────────────┘ │
│                              │                                               │
│          ┌───────────────────┼───────────────────┐                          │
│          │                   │                   │                          │
│          ▼                   ▼                   ▼                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│   │   FastAPI   │     │   Solana    │     │  Reclaim    │                   │
│   │   Backend   │     │   Devnet    │     │  Protocol   │                   │
│   │  (Port 8000)│     │             │     │   ZK-TLS    │                   │
│   └──────┬──────┘     └──────┬──────┘     └─────────────┘                   │
│          │                   │                                               │
│   ┌──────┴──────┐     ┌──────┴──────┐                                       │
│   │   ML/AI     │     │  MagicBlock │                                       │
│   │  Pipeline   │     │     ER      │                                       │
│   │             │     │  (Gasless)  │                                       │
│   │ • BERT NER  │     │             │                                       │
│   │ • PubMedBERT│     │ • Router    │                                       │
│   │ • Mistral-7B│     │ • TEE       │                                       │
│   │ • Geo Score │     │ • US ER     │                                       │
│   └─────────────┘     └─────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Demo Video

<!-- Add your demo video link here -->
**[Watch the Full Demo (3 minutes)](#)** — Coming soon

### Demo Flow

1. **ZK Verification** (0:00-0:30): Connect wallet, verify patient data via Reclaim Protocol
2. **ML Pipeline** (0:30-1:30): Watch AI analyze patient against 97 trials
3. **ER Transactions** (1:30-2:15): See 4 gasless Solana transactions execute
4. **Voice Consent** (2:15-3:00): Say "I want to participate" to log consent on-chain

---

## Screenshots

<!-- Tell me where you need screenshots and I'll note them -->

### Pipeline Page
*Screenshot needed: Full pipeline page showing ZK verification + ML processing + ER transactions*

### Results Page with ZK Badge
*Screenshot needed: Results page showing "ZK Verified" badge and "On-Chain Proof" links*

### Raw ZK Proof Modal
*Screenshot needed: The "View Raw Proof" modal showing cryptographic JSON*

### Voice Assistant
*Screenshot needed: Voice page showing "Already recorded on-chain" success*

---

## Quick Start

### Prerequisites

- **Node.js** 20+ and **pnpm**
- **Python** 3.12+
- **Phantom Wallet** (browser extension, set to Devnet)
- **Solana CLI** (optional, for program deployment)

### 1. Clone & Install

```bash
git clone https://github.com/Abhishek222983101/CogniStream-MagicBlock-ER.git
cd CogniStream-MagicBlock-ER

# Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
pnpm install
```

### 2. Environment Setup

**Backend** (`.env` in root):
```env
MISTRAL_API_KEY=your_mistral_api_key
GOOGLE_API_KEY=your_gemini_api_key
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg
GOOGLE_API_KEY=your_gemini_api_key
```

### 3. Run

```bash
# Terminal 1 - Backend
cd /path/to/CogniStream-MagicBlock-ER
source .venv/bin/activate
PYTHONPATH=. python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 - Frontend
cd /path/to/CogniStream-MagicBlock-ER/frontend
pnpm dev
```

### 4. Run the Pipeline locally

1. Open `http://localhost:3000`
2. Follow the steps in the Demo Flow section to test the app!

---

## Project Structure

```
CogniStream-MagicBlock-ER/
├── programs/cognistream/           # Anchor smart contract
│   └── src/
│       ├── lib.rs                  # Main program (instructions)
│       ├── state.rs                # Account structures (PatientRecord, MatchResult, ConsentLog)
│       ├── constants.rs            # Seeds, validators, limits
│       └── errors.rs               # Custom error codes
│
├── frontend/                       # Next.js 16 application
│   └── src/
│       ├── app/
│       │   ├── pipeline/page.tsx   # Main ER demo page
│       │   ├── results/page.tsx    # ML results + ZK badge + On-chain links
│       │   ├── voice/page.tsx      # Voice assistant with gasless consent
│       │   └── dashboard/page.tsx  # Landing dashboard
│       ├── components/
│       │   └── WalletProvider.tsx  # ER endpoints + context
│       └── lib/
│           ├── er-client.ts        # Full ER transaction client
│           ├── reclaim-client.ts   # ZK-TLS verification
│           ├── pdas.ts             # PDA derivation helpers
│           ├── voice-consent.ts    # Voice intent detection
│           └── program.ts          # Anchor program setup
│
├── backend/                        # FastAPI ML backend
│   ├── main.py                     # FastAPI app + routes
│   ├── engine/
│   │   ├── main.py                 # Orchestrates ML pipeline
│   │   ├── anonymizer.py           # BERT NER for PII removal
│   │   ├── embedding_matcher.py    # PubMedBERT similarity
│   │   ├── llm_matcher.py          # Mistral-7B reasoning
│   │   ├── rule_engine.py          # Deterministic criteria
│   │   └── geo_scorer.py           # Haversine distance
│   └── data/
│       └── trials.json             # 100+ clinical trial database
│
├── target/idl/
│   └── cognistream.json            # Program IDL (auto-generated)
│
├── data/
│   └── patients.json               # Sample patient records
│
├── Anchor.toml                     # Anchor configuration
├── Cargo.toml                      # Rust workspace
└── README.md                       # This file
```

---

## API Reference

### Backend Endpoints (FastAPI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/patients` | GET | List all patients |
| `/api/patients` | POST | Create/save patient |
| `/api/match-all` | POST | Run full ML pipeline |
| `/api/anonymize` | POST | Anonymize patient text |
| `/api/voice` | POST | Process voice query + detect consent intent |

### Solana Program Instructions

| Instruction | Accounts | Args |
|-------------|----------|------|
| `init_patient` | `[owner, patient_record, system_program]` | `patient_id: String, data_hash: [u8; 32]` |
| `delegate_patient` | `[payer, owner, patient_record, validator?, buffer, delegation_record, delegation_program, system_program]` | — |
| `record_match` | `[authority, patient_record, match_result, system_program]` | `trial_id: String, result_hash: [u8; 32], score_bps: u16` |
| `log_consent` | `[authority, patient_record, consent_log, system_program]` | `trial_id: String, consent_type: u8` |
| `revoke_consent` | `[owner, patient_record, consent_log]` | — |

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js, React, TailwindCSS | 16.1.6, 19.2, 4.x |
| **Wallet** | Solana Wallet Adapter, Phantom | 0.15.x |
| **Blockchain** | Anchor, Solana Web3.js | 0.32.1, 1.98 |
| **ER** | MagicBlock Router, Delegation SDK | devnet |
| **ZK** | Reclaim Protocol SDK | 3.x |
| **Backend** | FastAPI, Python | 0.x, 3.12 |
| **ML/NLP** | SciSpacy, PubMedBERT, Mistral-7B | — |
| **Voice** | Web Speech API, Google Gemini | — |

---

## Hackathon Submission Checklist

- [x] Anchor program deployed to Devnet
- [x] MagicBlock ER integration (delegation, gasless txs)
- [x] TEE privacy mode toggle
- [x] Reclaim Protocol ZK-TLS verification
- [x] Raw ZK Proof modal for judges
- [x] Multi-stage ML pipeline (NER, Embeddings, LLM)
- [x] Voice assistant with gasless consent
- [x] Live Solscan explorer links
- [x] Idempotent transaction handling (no duplicate errors)
- [x] Full documentation

---

## Team

**Abhishek Tiwari**
- GitHub: [@Abhishek222983101](https://github.com/Abhishek222983101)
- Email: abhishekrahul1445@gmail.com
- Telegram: @Abhisheksoni1445
- Twitter: [@Abhishekislinux](https://twitter.com/Abhishekislinux)

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built with MagicBlock Ephemeral Rollups for the Solana Blitz v3 Hackathon**

</div>
