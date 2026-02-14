# PaperTrail AI

A local-first, production-quality document management and AI extraction app.

## Features
- Upload PDFs/Images, extract text, chunk, embed, and classify
- Store vectors in Pinecone, metadata in SQLite
- Chat with RAG and citations
- Timeline of deadlines

## Backend
1. Create and activate a virtual environment:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your keys
   uvicorn app.main:app --reload
   ```

## Frontend
1. Install and run:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

## Seed/Test Script
- See `backend/scripts/seed_test.py` for a sample upload and process script.

## Environment Variables
- See `.env.example` in backend for required keys.

## Notes
- All LLM and Pinecone calls are backend-only. Never expose API keys to frontend.
- If Pinecone index or dimension mismatch, backend will return a clear error.
