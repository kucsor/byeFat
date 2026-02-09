'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function analyzeFoodImage(base64Image: string) {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not set');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Remove the data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const imageParts = [
      {
        inlineData: {
          data: base64Image.split(',')[1] || base64Image,
          mimeType: 'image/jpeg', // Assuming jpeg for simplicity, or we could detect
        },
      },
    ];

    const prompt = `Analyze this image of food. Identify the dish and estimate the serving size.
    Return ONLY a valid JSON object (no markdown formatting, no code blocks) with this structure:
    {
      "name": "string (dish name)",
      "calories": number (estimated total calories),
      "protein_g": number (estimated protein in grams),
      "carbs_g": number (estimated carbs in grams),
      "fats_g": number (estimated fats in grams),
      "quantity_g": number (estimated weight in grams)
    }`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Sanitize the response to ensure it's pure JSON
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(jsonString);
    return data;

  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    throw new Error('Failed to analyze food image.');
  }
}
