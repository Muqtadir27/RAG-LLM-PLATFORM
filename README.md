# RAG LLM Platform

A Retrieval-Augmented Generation (RAG) system built with Node.js, Express, and vanilla JavaScript. This platform allows users to upload PDF documents, ask questions about their content, and receive AI-generated answers based on the retrieved information.

## 🚀 Deployment Options

### Railway Deployment (Recommended)

This project is configured for easy deployment on Railway.app:

1. **Connect to Railway**
   - Push your code to GitHub
   - Create a new project on Railway
   - Connect your GitHub repository

2. **Configure Environment Variables** (Optional)
   - `GROQ_API_KEY` - For cloud-based LLM processing (faster)
   - `HF_TOKEN` - For Hugging Face embeddings (optional)
   - `OLLAMA_HOST` - Custom Ollama endpoint (default: http://localhost:11434)

3. **Deploy**
   - Railway will automatically detect the `railway.json` configuration
   - The application will build using the Dockerfile in `backend/`
   - Your RAG platform will be live at your Railway URL

> **Note**: By default, the application uses Ollama for local processing. For production use, we recommend setting up `GROQ_API_KEY` for better performance.

### Local Development

#### Prerequisites

- Node.js (v18+)
- Ollama (for local LLM processing)

#### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rag-llm-platform
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Start Ollama** (separate terminal)
   ```bash
   ollama serve
   ```

4. **Pull required models**
   ```bash
   ollama pull phi3
   ollama pull nomic-embed-text
   ```

5. **Start the backend server**
   ```bash
   npm start
   ```

6. **Access the application**
   Open `http://localhost:3001` in your browser

## 🏗️ Architecture

```
├── backend/          # Node.js Express server
│   ├── rag/          # Core RAG modules
│   │   ├── embed.js    # Text embedding
│   │   ├── generate.js # Answer generation
│   │   ├── index.js    # Document management
│   │   ├── ingest.js   # Document ingestion
│   │   ├── ingestPdf.js # PDF processing
│   │   ├── retrieve.js # Document retrieval
│   │   └── similarity.js # Similarity scoring
│   ├── uploads/      # Uploaded PDF files
│   ├── server.js     # Main server file
│   └── package.json
├── frontend/         # Static HTML/CSS/JS frontend
│   ├── index.html    # Main application page
│   ├── upload.html   # Document upload page
│   ├── explore.html  # Document explorer
│   ├── how.html      # How it works page
│   ├── style.css     # Styling
│   └── JavaScript files
├── docker-compose.yml # Docker orchestration
├── railway.json      # Railway deployment config
└── nginx.conf        # Nginx reverse proxy config
```

## 📡 API Endpoints

- `POST /query` - Ask questions about documents
- `POST /upload` - Upload PDF documents
- `GET /documents` - List all processed documents
- `GET /health` - Health check endpoint

## ⚙️ How It Works

1. **Document Ingestion**: PDF files are parsed and split into chunks
2. **Embedding**: Text chunks are converted to vector embeddings using Ollama
3. **Storage**: Documents and embeddings are stored in memory
4. **Retrieval**: User questions are embedded and matched against stored documents
5. **Generation**: Relevant document chunks are sent to LLM for answer generation

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3001 | No |
| `GROQ_API_KEY` | Groq API key for cloud LLM | None | No (falls back to Ollama) |
| `HF_TOKEN` | Hugging Face token for embeddings | None | No (falls back to Ollama) |
| `OLLAMA_HOST` | Ollama service URL | http://localhost:11434 | No |

### Processing Modes

1. **Local Mode** (Default): Uses Ollama for both embeddings and generation
2. **Hybrid Mode**: Uses Ollama for embeddings, Groq for generation (set `GROQ_API_KEY`)
3. **Cloud Mode**: Uses Hugging Face for embeddings, Groq for generation (set both keys)

## 🛠️ Development

### Backend Structure

- `server.js`: Main Express server
- `rag/` directory contains core RAG functionality
- `uploads/`: Temporary file storage

### Frontend Structure

- `index.html`: Main application interface
- `upload.html`: Document upload interface
- `explore.html`: Document explorer
- `how.html`: Documentation and instructions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

ISC