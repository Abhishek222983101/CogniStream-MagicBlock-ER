#!/bin/bash
# TrialMatch AI - Backend Startup Script
# This script kills any old servers and starts a fresh, stable backend in the background.

echo "=========================================================="
echo "🚀 Starting TrialMatch AI Backend..."
echo "=========================================================="

# 1. Kill any existing backend process to prevent port 8000 conflicts
echo "1️⃣  Cleaning up old processes..."
fuser -k 8000/tcp 2>/dev/null || lsof -t -i :8000 | xargs kill -9 2>/dev/null
sleep 2

# 2. Activate the virtual environment
echo "2️⃣  Activating Python environment..."
cd /home/arch-nitro/Cogni-Stream
source /home/arch-nitro/MistralFluence/.venv/bin/activate

# 3. Start the server in the background (nohup prevents it from stopping when terminal closes)
echo "3️⃣  Starting FastAPI server in background..."
nohup env TRIALMATCH_SKIP_LLM=1 uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/trialmatch_backend.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend started successfully! (PID: $BACKEND_PID)"
echo ""
echo "⏳ Please wait ~45 seconds for PubMedBERT & NER models to load into memory."
echo "👀 To watch the logs in real-time, run:"
echo "    tail -f /tmp/trialmatch_backend.log"
echo "=========================================================="