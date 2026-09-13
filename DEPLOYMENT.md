# Deployment Guide

This project deploys as two separate services: a Python/FastAPI backend and a Next.js frontend, both built from the Dockerfiles in this repo.

## Prerequisites

- A GitHub account with this repo pushed
- Accounts for the three services this app depends on (all have free tiers):
  - [Groq](https://console.groq.com) — LLM generation
  - [Jina AI](https://jina.ai) — embeddings
  - [Qdrant Cloud](https://cloud.qdrant.io) — vector database (create a free cluster)
- A [Railway](https://railway.app) account (free tier available)

## Required environment variables

Set these in your deployment platform's dashboard (or in `.env` for local Docker):

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Groq API key for LLM generation |
| `GROQ_MODEL` | e.g. `openai/gpt-oss-120b` — check [console.groq.com/docs/deprecations](https://console.groq.com/docs/deprecations) periodically, Groq retires models over time |
| `JINA_API_KEY` | Jina API key for document embeddings |
| `QDRANT_URL` | Your Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Your Qdrant Cloud API key |
| `FRONTEND_URL` | Your deployed frontend's URL (for CORS) |
| `NEXT_PUBLIC_API_URL` | Your deployed backend's URL (frontend only) |

## Deploying the backend to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → select this repository
2. Railway will detect `railway.json`, which points it at `Dockerfile.backend`
3. In the project's **Variables** tab, add the five backend env vars from the table above
4. Deploy — Railway will build the image and give you a live URL

## Deploying the frontend

The frontend (`Dockerfile.frontend`) can deploy the same way — as a second Railway service pointed at the same repo, or on Vercel/Netlify if you prefer a dedicated frontend host. Either way, set `NEXT_PUBLIC_API_URL` to your backend's live URL.

## Running locally with Docker Compose

```bash
cp .env.example .env
# fill in your real API keys in .env
docker-compose up --build
```
Backend will be available at `http://localhost:8000`, frontend at `http://localhost:3000`.

## Running locally without Docker

**Backend:**
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting

- **Backend won't start / `ModuleNotFoundError`** — make sure your virtual environment is activated (you should see `(venv)` at the start of your terminal prompt) before running `uvicorn`.
- **"Backend unreachable" in the frontend** — check that the backend is actually running and that `NEXT_PUBLIC_API_URL` points at the right address/port.
- **Startup log shows `Collection 'documents' doesn't exist`** — expected on a brand-new Qdrant cluster; it gets created automatically on your first document upload.
- **`uvloop` install error on Windows** — `uvloop` doesn't support Windows. It's already marked as Unix-only in `requirements.txt` (`; sys_platform != "win32"`), so this shouldn't happen on a fresh install — if it does, confirm you're using the latest `requirements.txt`.