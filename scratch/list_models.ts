import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log("Listing models...");
    const models = await ai.models.list();
    for await (const model of models) {
      console.log(`- ${model.name}`);
    }
  } catch (error: any) {
    console.error("Failed to list models:", error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(await error.response.json()));
    }
  }
}

listModels();
