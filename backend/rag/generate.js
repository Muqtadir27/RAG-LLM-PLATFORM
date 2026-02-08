import fetch from "node-fetch";

export async function generate(context, question) {
  const prompt = `
You are a strict, extraction-only Retrieval-Augmented Generation (RAG) assistant.

Your task is to extract information ONLY from the retrieved document text.
Do NOT infer, assume, generalize, or use world knowledge.

====================
ABSOLUTE OUTPUT RULE
====================
If the user asks to "list" something:
- Output ONLY the extracted list.
- No explanations.
- No reasoning.
- No context.
- No paragraphs.
- No examples.

====================
EXTRACTION RULES
====================
- Extract ONLY items that are explicitly mentioned in the document.
- Do NOT add items based on implication, common knowledge, or related experience.
- Do NOT include internships, courses, programs, or learning paths as tools or platforms unless explicitly stated as a tool.

====================
CATEGORY DISCIPLINE
====================
Never mix categories.

Use these definitions STRICTLY:

- Programming languages:
  Formal languages explicitly mentioned as being used (e.g., "trained in", "worked with").

- Libraries:
  Software packages explicitly named and used for implementation or processing.

- Tools / Platforms:
  Software applications or platforms explicitly named as tools (e.g., BI tools, analytics platforms).

- Certifications:
  Formal credentials, certifications, or course titles listed under certifications or learning sections.

- Concepts, skills, fundamentals, algorithms, internships, or programs:
  MUST NOT be included unless explicitly requested.

====================
CRITICAL NEGATIVE RULE
====================
If the document does NOT explicitly name items for a category, output EXACTLY:
Not mentioned in the document.

This applies especially to:
- Cloud platforms
- Databases
- DevOps tools
- Frameworks not explicitly named

DO NOT guess (e.g., AWS, Azure, GCP) unless explicitly written in the document.

====================
LIST FORMATTING
====================
- Bullet points only.
- One item per line.
- No inline text.
- No numbering.
- No bolding.

====================
REASONING SUPPRESSION
====================
- Do NOT explain why items are included or excluded.
- Do NOT justify decisions.
- Do NOT summarize.

====================
FINAL CONSTRAINT
====================
Output ONLY the final extracted answer.
Any additional text is incorrect.

Context:
${context.map(d => `Source: ${d.source}\nContent: ${d.content}`).join('\n\n')}

Question:
${question}

Final Answer:
`

  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
  const groqApiKey = process.env.GROQ_API_KEY;

  if (groqApiKey) {
    console.log("🤖 Generating answer via Groq API...");
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'You are a strict, extraction-only RAG assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0
      })
    });

    const data = await res.json();
    if (data.error) {
      console.error("GROQ ERROR:", data.error);
      throw new Error(`Groq API error: ${data.error.message}`);
    }
    return data.choices[0].message.content.trim();
  }

  console.log("🤖 Generating answer via Ollama...");
  const res = await fetch(`${ollamaHost}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'phi3',
      prompt,
      stream: false,
      options: {
        temperature: 0
      }
    })
  });

  const data = await res.json();
  return data.response.trim();
}
