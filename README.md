# CogniStream - Privacy-First Clinical Trial Matching on Solana

> **Hackathon**: MagicBlock Solana Blitz v3 (April 3-5, 2026)
> **Track**: Healthcare + Privacy with Ephemeral Rollups

## Overview

CogniStream is a privacy-first clinical trial matching platform that leverages **MagicBlock Ephemeral Rollups (ER)** for gasless, sub-50ms on-chain transactions. Patient health data is processed through AI pipelines while consent and matching events are recorded immutably on Solana via delegated accounts.

### Why Ephemeral Rollups?

Healthcare data requires:
- **Speed**: Real-time patient matching without blockchain latency
- **Privacy**: TEE-protected transactions for sensitive health data  
- **Cost**: Gasless operations for patient onboarding
- **Compliance**: Immutable consent logs for HIPAA/audit trails

MagicBlock ER delivers all four through account delegation to high-performance rollup validators.

## Architecture

```
                    +------------------+
                    |   Frontend UI    |
                    |  (Next.js 15)    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+         +---------v---------+
    |   Backend API     |         |   Solana Program  |
    |   (FastAPI + ML)  |         |   (Anchor/Rust)   |
    +-------------------+         +-------------------+
              |                             |
    +---------v---------+         +---------v---------+
    | NER + Embeddings  |         | MagicBlock Router |
    | Mistral-7B LLM    |         | devnet-router.    |
    | PubMedBERT        |         | magicblock.app    |
    +-------------------+         +---------+---------+
                                            |
                                  +---------v---------+
                                  | Ephemeral Rollup  |
                                  | (Gasless + TEE)   |
                                  +-------------------+
```

## MagicBlock ER Integration

### Program ID (Devnet)
```
3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg
```

### Key Instructions

| Instruction | Purpose | ER Feature |
|-------------|---------|------------|
| `initPatient` | Create patient PDA with health hash | L1 anchor |
| `delegatePatient` | Delegate to ER validator | Gasless mode |
| `recordMatch` | Log trial match on-chain | Sub-50ms |
| `logConsent` | HIPAA consent timestamp | Immutable audit |
| `undelegatePatient` | Return to L1 | Settlement |

### ER Flow

```typescript
// 1. Initialize patient on L1
const patientPda = await erClient.initPatient(healthHash);

// 2. Delegate to Ephemeral Rollup (gasless from here)
await erClient.delegatePatient(patientPda, validatorKey);

// 3. Record matches at 50ms speed (no gas!)
for (const match of matches) {
  await erClient.recordMatch(patientPda, match.trialId, match.score);
}

// 4. Log consent with timestamp
await erClient.logConsent(patientPda, consentType);
```

### TEE Privacy Mode

For maximum privacy, toggle TEE mode to route through MagicBlock's Trusted Execution Environment:

```typescript
const teeConnection = await connectPrivateTee();
// All transactions encrypted in TEE enclave
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TailwindCSS |
| Wallet | Solana Wallet Adapter, Phantom |
| Blockchain | Anchor 0.31, Solana 3.1 |
| ER | MagicBlock Router, Delegation Program |
| Backend | FastAPI, Python 3.12 |
| ML/NLP | SciSpacy NER, PubMedBERT, Mistral-7B |
| Privacy | MagicBlock TEE, SHA-256 hashing |

## Quick Start

### Prerequisites
- Node.js 20+, pnpm
- Python 3.12+
- Solana CLI 3.x
- Phantom Wallet (Devnet)

### 1. Clone & Install

```bash
git clone https://github.com/Abhishek222983101/CogniStream-MagicBlock-ER.git
cd CogniStream-MagicBlock-ER

# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
pnpm install
```

### 2. Environment Setup

```bash
# Backend .env
MISTRAL_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key

# Frontend .env.local
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg
```

### 3. Run

```bash
# Terminal 1 - Backend
uvicorn backend.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend && pnpm dev
```

### 4. Test ER Flow

1. Open `http://localhost:3000/pipeline`
2. Connect Phantom wallet (Devnet)
3. Load sample patient data
4. Click "Process" to trigger:
   - AI analysis (backend)
   - `initPatient` transaction
   - `delegatePatient` to ER
   - `recordMatch` for each trial
   - `logConsent` for HIPAA

## Project Structure

```
CogniStream-MagicBlock-ER/
├── programs/cognistream/      # Anchor program
│   └── src/
│       ├── lib.rs            # Main program logic
│       ├── state.rs          # Account structures
│       ├── constants.rs      # Seeds, validators
│       └── errors.rs         # Custom errors
├── frontend/
│   └── src/
│       ├── app/pipeline/     # Main ER demo page
│       ├── components/
│       │   ├── WalletProvider.tsx  # ER context
│       │   └── ERStatusIndicator.tsx
│       └── lib/
│           ├── er-client.ts  # ER transaction client
│           ├── pdas.ts       # PDA derivation
│           ├── tee.ts        # TEE connection
│           └── program.ts    # Anchor setup
├── backend/
│   ├── main.py               # FastAPI app
│   ├── engine/               # ML pipelines
│   └── routers/
│       └── tee_auth.py       # TEE auth endpoints
└── target/idl/
    └── cognistream.json      # Program IDL
```

## API Endpoints

### Backend (FastAPI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System status |
| `/api/anonymize` | POST | De-identify patient PHI |
| `/api/match-all` | POST | Match patient to all trials |
| `/api/tee/status` | GET | TEE connection status |
| `/api/tee/auth` | POST | Generate TEE auth token |

### Solana Program

| Instruction | Accounts | Data |
|-------------|----------|------|
| `initPatient` | patient, payer, system | health_hash |
| `delegatePatient` | patient, delegation_program | validator |
| `recordMatch` | patient, authority | trial_id, score |
| `logConsent` | patient, authority | consent_type |

## Hackathon Deliverables

- [x] Anchor program deployed to Devnet
- [x] Frontend with wallet integration
- [x] ER delegation working (gasless)
- [x] TEE privacy toggle
- [x] Backend ML pipeline
- [x] Documentation

## Team

**Abhishek Tiwari**
- Email: abhishekrahul1445@gmail.com
- Telegram: @Abhisheksoni1445
- Twitter: @Abhishekislinux

## License

MIT
