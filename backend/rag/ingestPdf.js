import fs from "fs";
import { PDFParse } from "pdf-parse";
import { embedText } from "./embed.js";
import { documents } from "./index.js";

function chunkText(text, size = 400, overlap = 50) {
  const words = text.split(" ");
  const chunks = [];

  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(" "));
  }

  return chunks;
}

export async function ingestPdf(filePath, fileName) {
  console.log(`DEBUG: Ingesting PDF ${fileName}`);
  const buffer = fs.readFileSync(filePath);
  console.log("DEBUG: Buffer read, parsing PDF...");
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  console.log("DEBUG: PDF parsed, chunking...");

  const chunks = chunkText(data.text);
  console.log(`DEBUG: Text chunked into ${chunks.length} parts.`);

  for (let i = 0; i < chunks.length; i++) {
    console.log(`DEBUG: Embedding chunk ${i + 1}/${chunks.length}...`);
    const embedding = await embedText(chunks[i]);

    documents.push({
      content: chunks[i],
      embedding,
      source: fileName,
      chunk: i,
      timestamp: new Date().toISOString()
    });
  }
}
