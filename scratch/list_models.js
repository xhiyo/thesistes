import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const genAI = new GoogleGenAI(process.env.VITE_GEMINI_API_KEY);
  try {
    const response = await genAI.listModels();
    console.log("Models available:");
    response.models.forEach(m => {
      console.log(`- ${m.name}`);
    });
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

listModels();
