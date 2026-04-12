# RAG.NEXUS 🧠

> A production-grade Retrieval-Augmented Generation (RAG) platform with a cyberpunk-inspired UI. Upload PDFs, ask questions, and get AI-powered answers grounded in your documents — with built-in evaluation scoring.

![RAG Nexus](https://img.shields.io/badge/RAG-Nexus-00ffcc?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Qdrant](https://img.shields.io/badge/Qdrant-Cloud-dc244c?style=for-the-badge)

---

## ✨ Features

- 📄 **PDF Ingestion** — Upload and index PDFs into a vector database
- 🔍 **Semantic Search** — Retrieve relevant chunks using cosine similarity
- 🤖 **AI-Powered Answers** — Generate responses grounded in your documents via Groq LLM
- 📊 **Eval Pipeline** — Built-in evaluation scoring: Faithfulness, Relevance, Hallucination Guard
- 🔐 **Session Isolation** — Each user session has isolated document access
- 🗑️ **Document Management** — List and delete uploaded documents per session
- ⚡ **Fast & Lightweight** — No local ML models, fully API-driven

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│   FastAPI        │────▶│  Qdrant Cloud   │
│   Frontend      │     │   Backend        │     │  Vector DB      │
│   (Render)      │     │   (Render)       │     │  (Managed)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
             ┌──────▼──────┐         ┌────────▼───────┐
             │  Jina AI    │         │   Groq API     │
             │  Embeddings │         │   LLM (GLM-4.7)│
             └─────────────┘         └────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TailwindCSS 4, TypeScript |
| **Backend** | FastAPI, Python 3.11, Uvicorn |
| **Vector DB** | Qdrant Cloud (free tier) |
| **Embeddings** | Jina AI `jina-embeddings-v2-base-en` (768-dim) |
| **LLM** | Groq API |
| **PDF Parsing** | PyPDF2 |
| **Deployment** | Render (frontend + backend) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11
- Node.js 18+
- API keys for: [Groq](https://console.groq.com), [Jina AI](https://jina.ai), [Qdrant Cloud](https://cloud.qdrant.io)

### Backend Setup

```bash
# Clone the repo
git clone https://github.com/Muqtadir27/RAG-LLM-PLATFORM.git
cd RAG-LLM-PLATFORM/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in your API keys (see Environment Variables section)

# Run the backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

### Backend (`.env`)

| Variable | Description | Required |
|---|---|---|
| `GROQ_API_KEY` | Groq API key for LLM generation | ✅ |
| `JINA_API_KEY` | Jina AI key for embeddings | ✅ |
| `QDRANT_URL` | Qdrant Cloud cluster URL | ✅ |
| `QDRANT_API_KEY` | Qdrant Cloud API key | ✅ |
| `FRONTEND_URL` | Frontend URL for CORS | ✅ |
| `UPLOAD_DIR` | Directory for uploaded PDFs | ❌ (default: `uploads/`) |
| `CHROMA_DIR` | Legacy ChromaDB dir (unused) | ❌ |

### Frontend (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/upload` | Upload and ingest a PDF |
| `POST` | `/query` | Query documents with a question |
| `GET` | `/documents` | List documents for a session |
| `DELETE` | `/documents/{id}` | Delete a document |

All endpoints (except `/health`) require an `X-Session-Id` header for session isolation.

---

## 🧪 Eval Pipeline

RAG.NEXUS includes a built-in evaluation pipeline that scores answers on three dimensions:

- **Faithfulness** — Is the answer grounded in the retrieved context?
- **Relevance** — Does the answer actually address the question?
- **Hallucination Guard** — Does the answer contain fabricated information?

Each dimension is scored 0–100. An overall score of 70+ is considered a **PASS**.

---

## 📁 Project Structure

```
RAG-LLM-PLATFORM/
├── backend/
│   ├── main.py              # FastAPI app + routes
│   ├── eval_router.py       # Evaluation pipeline
│   ├── requirements.txt
│   └── rag/
│       ├── embed.py         # Jina AI embeddings + Qdrant storage
│       ├── retrieve.py      # Semantic search + document management
│       ├── ingest.py        # PDF parsing + chunking
│       └── generate.py      # Groq LLM answer generation
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main UI
│   │   ├── layout.tsx
│   │   ├── lib/
│   │   │   ├── api.ts       # API client
│   │   │   └── session.ts   # Session management
│   │   └── components/      # UI components
│   ├── package.json
│   └── next.config.ts
└── chroma/
    └── Dockerfile           # Legacy ChromaDB service (deprecated)
```

---

## ☁️ Deployment

The platform is deployed on [Render](https://render.com):

| Service | URL |
|---|---|
| Frontend | `https://rag-nexus-frontend.onrender.com` |
| Backend | `https://rag-nexus-backend.onrender.com` |

### Deploy Your Own

1. Fork this repo
2. Create two Web Services on Render (one for `frontend/`, one for `backend/`)
3. Set environment variables as listed above
4. Deploy!

---

## 📝 License

MIT License — feel free to use, modify, and distribute.

---

## 🙏 Acknowledgements

- [Groq](https://groq.com) for blazing fast LLM inference
- [Qdrant](https://qdrant.tech) for the vector database
- [Jina AI](https://jina.ai) for free embeddings API
- [Render](https://render.com) for hosting
