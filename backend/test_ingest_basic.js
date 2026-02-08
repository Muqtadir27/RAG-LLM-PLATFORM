import { ingestPdf } from "./rag/ingestPdf.js";
import fs from "fs";
import path from "path";

async function test() {
    const testPdfPath = "test_doc.pdf";

    // Create a dummy PDF if strictly text parsing or just try to ingest a real one if I can find one. 
    // Since I don't have a real PDF, I will try to use the one likely uploaded or just check if the function imports/runs without syntax error.
    // Actually, pdf-parse fails on non-pdf headers.

    try {
        console.log("Import successful. Checking function...");
        if (typeof ingestPdf !== 'function') throw new Error("ingestPdf is not a function");
        console.log("ingestPdf is a function.");
    } catch (err) {
        console.error("Test Failed:", err);
    }
}

test();
