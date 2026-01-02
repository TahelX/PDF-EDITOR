import { GoogleGenAI } from "@google/genai";

export async function analyzePdfContent(text: string): Promise<string> {
  // Use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze the following extracted text from a PDF document. 
    Provide:
    1. A brief 2-sentence summary of the content.
    2. A suggested intelligent filename (without extension).
    3. Key topics identified.
    4. If it looks like a multi-document bundle (e.g. several invoices or reports), suggest where to split it.

    Text content:
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Use .text property directly instead of .text()
    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to get AI insights. Please check your connection.";
  }
}
