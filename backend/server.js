import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";

import { ingest } from "./rag/ingest.js";
import { ingestPdf } from "./rag/ingestPdf.js";
import { retrieveRelevantDocs } from "./rag/retrieve.js";
import { generate } from "./rag/generate.js";
import { documents } from "./rag/index.js";

/* =====================
   APP SETUP
===================== */
const app = express();
app.use(cors());
app.use(express.json());

/* =====================
   FILE UPLOAD SETUP
===================== */
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }
});

/* =====================
   INITIAL INGEST
===================== */
async function bootstrap() {
  console.log("📚 Bootstrap started...");

  // Log detected environment variables (for debugging)
  console.log("🛠️  Environment Check:");
  console.log(`- PORT: ${process.env.PORT || 'Default (3001)'}`);
  console.log(`- HF_TOKEN: ${process.env.HF_TOKEN ? '✅ Present' : '❌ Missing'}`);
  console.log(`- GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Present' : '❌ Missing'}`);

  const dataDir = "./data";
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      if (file.endsWith(".pdf")) {
        console.log(`📄 Found PDF: ${file}`);
        await ingestPdf(path.join(dataDir, file), file);
      }
    }
  }
  console.log("DEBUG: Documents length:", documents.length);
}

await bootstrap();

/* =====================
   QUERY ENDPOINT
===================== */
app.post("/query", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    console.log(`🔍 Querying: "${question}"`);
    const retrievedDocs = await retrieveRelevantDocs(question, 3);
    console.log(`📄 Retrieved ${retrievedDocs.length} snippets.`);

    const provider = process.env.GROQ_API_KEY ? "Groq API" : "Ollama";
    console.log(`🤖 Generating answer via ${provider}...`);
    const answer = await generate(retrievedDocs, question);
    console.log(`✅ Generation complete.`);

    res.json({
      answer,
      sources: retrievedDocs.map(d => ({
        source: d.source,
        chunk: d.chunk,
        text: d.content
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query failed" });
  }
});

/* =====================
   PDF UPLOAD ENDPOINT
===================== */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      console.error("❌ Upload failed: No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`📤 Upload received: ${req.file.originalname} (${req.file.size} bytes)`);

    if (!req.file.originalname.endsWith(".pdf")) {
      console.error("❌ Upload failed: Not a PDF");
      return res.status(400).json({ error: "Only PDFs are supported" });
    }

    console.log(`⚙️  Starting ingestion for ${req.file.originalname}...`);
    await ingestPdf(req.file.path, req.file.originalname);
    console.log(`✅ Ingestion successful: ${req.file.originalname}`);

    res.json({
      success: true,
      filename: req.file.originalname
    });
  } catch (err) {
    console.error("🔥 PDF Ingestion Error Details:", err);
    res.status(500).json({
      error: "PDF ingestion failed",
      message: err.message
    });
  }
});

/* =====================
   DOCUMENTS (EXPLORER)
===================== */
app.get("/documents", (req, res) => {
  res.json(documents.slice(-100));
});

/* =====================
   HEALTH CHECK
===================== */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* =====================
   STATIC FRONTEND SERVING
===================== */
const __dirname = path.resolve();
// If run from backend/, the root is ../. If run from root, frontend is ./frontend
let frontendDir = path.join(__dirname, "frontend");
if (!fs.existsSync(frontendDir)) {
  frontendDir = path.join(__dirname, "../frontend");
}

if (fs.existsSync(frontendDir)) {
  console.log(`🌐 Serving frontend from: ${frontendDir}`);
  app.use(express.static(frontendDir));
} else {
  console.warn("⚠️ Frontend directory not found. Static serving disabled.");
}

// Catch-all to serve index.html for any unknown routes (SPA style)
app.get(/.*/, (req, res) => {
  const indexPath = path.join(frontendDir, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend not found");
  }
});

/* =====================
   START SERVER
===================== */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 RAG backend running on port ${PORT}`);
});