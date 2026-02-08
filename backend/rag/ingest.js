import fs from "fs";
import { embedText } from "./embed.js";
import { documents } from "./index.js";

export async function ingest() {
  const dataPath = "./data/docs.json";

  if (!fs.existsSync(dataPath)) {
    console.log("⚠️ No base documents found");
    return;
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const docs = JSON.parse(raw);

  for (const doc of docs) {
    const embedding = await embedText(doc.content);

    documents.push({
      content: doc.content,
      embedding,
      source: "docs.json"
    });
  }

  console.log(`✅ Ingested ${docs.length} base documents`);
}
