import { cosineSimilarity } from "./similarity.js";
import { embedText } from "./embed.js";
import { documents } from "./index.js";

export async function retrieveRelevantDocs(query, topK = 3) {
  const queryEmbedding = await embedText(query);

  const scoredDocs = documents.map(doc => ({
    ...doc,
    score: cosineSimilarity(queryEmbedding, doc.embedding)
  }));

  scoredDocs.sort((a, b) => b.score - a.score);

  return scoredDocs.slice(0, topK);
}
