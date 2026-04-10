import { documents } from "./index.js";
import { embedText } from "./embed.js";
import { retrieveRelevantDocs } from "./retrieve.js";

const run = async () => {
  documents.push({
    content: "JavaScript is used for frontend development",
    embedding: await embedText("JavaScript is used for frontend development")
  });

  documents.push({
    content: "Python is widely used in machine learning",
    embedding: await embedText("Python is widely used in machine learning")
  });

  const results = await retrieveRelevantDocs("What language is used for ML?");
  console.log(results.map(r => r.content));
};

run();
