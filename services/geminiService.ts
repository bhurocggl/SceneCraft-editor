
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { GeminiPart } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const queryModel = async (prompt: string, endpoint: string): Promise<GeminiPart[]> => {
  console.log(`Querying real Gemini model '${endpoint}' with prompt:`, prompt);

  try {
    // This call now asks the model for a multi-part response directly,
    // instead of forcing it into a single JSON object.
    const result: GenerateContentResponse = await ai.models.generateContent({
        model: endpoint,
        contents: prompt,
    
    });

    const parts = result.candidates?.[0]?.content?.parts || [];

    // FIX: The type `Part` from `@google/genai` is not directly assignable to `GeminiPart` because
    // the properties on `inlineData` are optional in `Part`. We must manually map the response parts
    // to our stricter `GeminiPart` type, ensuring that `inlineData` is only included when both
    // `mimeType` and `data` are present.
    return parts
      .map((part): GeminiPart => {
        const newPart: GeminiPart = {};
        if (part.text) {
          newPart.text = part.text;
        }
        if (part.inlineData?.mimeType && part.inlineData.data) {
          newPart.inlineData = {
            mimeType: part.inlineData.mimeType,
            data: part.inlineData.data,
          };
        }
        return newPart;
      })
      .filter((p) => p.text || p.inlineData);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return [{ text: `Sorry, there was an error communicating with the model: ${errorMessage}` }];
  }
};
