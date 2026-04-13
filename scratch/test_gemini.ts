import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in .env");
    return;
  }

  console.log("Using API Key:", apiKey.substring(0, 5) + "...");
  
  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-3-flash-preview",
    "gemini-3-flash"
  ];

  for (const modelName of modelsToTry) {
    console.log(`\nTesting model: ${modelName}`);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: "Hello, this is a test.",
      });
      console.log(`Success with ${modelName}!`);
      console.log("Response:", response.text);
      break; // Exit if one works
    } catch (error: any) {
      console.error(`Failed with ${modelName}:`, error.message);
    }
  }
}

testGemini();
