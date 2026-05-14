import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function listModels() {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No API key found");
    return;
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    // There is no direct listModels in @google/genai like in @google/generative-ai
    // But we can try to hit an endpoint or just try a few names.
    console.log("Checking gemini-1.5-flash...");
    try {
      await ai.models.generateContent({ model: "gemini-1.5-flash", contents: "test" });
      console.log("gemini-1.5-flash works!");
    } catch (e) {
      console.log("gemini-1.5-flash failed:", e.message);
    }

    console.log("Checking gemini-pro...");
    try {
      await ai.models.generateContent({ model: "gemini-pro", contents: "test" });
      console.log("gemini-pro works!");
    } catch (e) {
      console.log("gemini-pro failed:", e.message);
    }
    console.log("Checking gemini-3-flash-preview...");
    try {
      await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: "test" });
      console.log("gemini-3-flash-preview works!");
    } catch (e) {
      console.log("gemini-3-flash-preview failed:", e.message);
    }
    console.log("Checking gemini-1.5-flash with v1...");
    try {
      const aiV1 = new GoogleGenAI({ apiKey, apiVersion: "v1" });
      await aiV1.models.generateContent({ model: "gemini-1.5-flash", contents: "test" });
      console.log("gemini-1.5-flash with v1 works!");
    } catch (e) {
      console.log("gemini-1.5-flash with v1 failed:", e.message);
    }
    console.log("\n--- Checking with @google/generative-ai ---");
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const modelsToTry = ["gemini-1.5-flash", "gemini-3-flash", "gemini-3-flash-preview", "gemini-pro"];
    for (const m of modelsToTry) {
      console.log(`Checking ${m}...`);
      try {
        const model = genAI.getGenerativeModel({ model: m });
        await model.generateContent("test");
        console.log(`${m} works!`);
      } catch (e) {
        console.log(`${m} failed:`, e.message);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

listModels();
