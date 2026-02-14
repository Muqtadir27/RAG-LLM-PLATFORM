import fetch from "node-fetch";

export async function embedText(text) {
  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
  const hfToken = process.env.HF_TOKEN;

  if (hfToken) {
    console.log("🤗 Generating embedding via Hugging Face...");
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
        {
          headers: { Authorization: `Bearer ${hfToken}` },
          method: "POST",
          body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face embedding failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`Hugging Face API error: ${JSON.stringify(result.error)}`);
      }

      // Hugging Face feature-extraction might return [ [ ... ] ] for single input
      if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0];
      }

      return result;
    } catch (err) {
      console.error("HF Embedding Error:", err);
      throw err;
    }
  }

  const response = await fetch(`${ollamaHost}/api/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text
    })
  });

  if (!response.ok) {
    throw new Error("Ollama embedding request failed");
  }

  const data = await response.json();
  return data.embedding;
}
