import { embedText } from "./rag/embed.js";

const run = async () => {
  const emb = await embedText("Hello world");
  console.log("Embedding length:", emb.length);
};

run();
