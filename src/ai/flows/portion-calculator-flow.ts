'use server';
/**
 * @fileOverview An AI flow to calculate nutritional information for a portion of cooked food.
 *
 * - calculatePortion - A function that handles the portion calculation.
 * - PortionCalculatorInput - The input type for the calculatePortion function.
 * - PortionCalculatorOutput - The return type for the calculatePortion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PortionCalculatorInputSchema = z.object({
  query: z.string().describe('The user\'s text describing the food, weights, and nutritional info.'),
});
export type PortionCalculatorInput = z.infer<typeof PortionCalculatorInputSchema>;

const PortionCalculatorOutputSchema = z.object({
  description: z.string().describe('A short, sensible description of the food item calculated, e.g., "Portion of cooked pasta".'),
  portionWeight: z.number().describe('The weight in grams of the final portion the user will eat.'),
  calories: z.number().describe('Calculated calories for the final portion.'),
  protein: z.number().describe('Calculated protein in grams for the final portion.'),
  fat: z.number().describe('Calculated fat in grams for the final portion.'),
  carbs: z.number().describe('Calculated carbohydrates in grams for the final portion.'),
  salt: z.number().optional().describe('Calculated salt in grams for the final portion.'),
});
export type PortionCalculatorOutput = z.infer<typeof PortionCalculatorOutputSchema>;

export type PortionCalculatorResponse =
  | { success: true; data: PortionCalculatorOutput }
  | { success: false; error: string };

export async function calculatePortion(
  input: PortionCalculatorInput
): Promise<PortionCalculatorResponse> {
  try {
    const result = await portionCalculatorFlow(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('AI Portion Calculator Error:', error);
    let errorMessage = 'Failed to calculate portion.';
    if (error.message?.includes('API key')) {
      errorMessage = 'Configurația AI lipsește (Cheia API). Te rugăm să adaugi GEMINI_API_KEY în variabilele de mediu.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

const prompt = ai.definePrompt({
  name: 'portionCalculatorPrompt',
  input: { schema: PortionCalculatorInputSchema },
  output: { schema: PortionCalculatorOutputSchema },
  prompt: `You are a nutritional calculator assistant. Your task is to analyze the user's text and return nutritional information as a structured JSON object.

The user can provide two types of queries:

1.  **Simple Food Lookup:** The user provides a food item and its weight (e.g., "200g apple", "150 grams of grilled chicken breast").
2.  **Complex Portion Calculation:** The user provides details about cooking, including nutritional values for the *raw* product, the raw weight, the cooked weight, and the final portion they ate.

**Your First Task:** Determine the query type.

**If the query is a Simple Food Lookup:**
1.  Identify the food item and its weight in grams.
2.  Use your internal knowledge (or tools if available) to find the approximate nutritional values (calories, protein, fat, carbs) for the specified amount of that food.
3.  Create a short, sensible description for the food (e.g., "Apple", "Grilled chicken breast"). \`portionWeight\` will be the weight specified by the user.
4.  Return the calculated values in the specified JSON format.

**If the query is a Complex Portion Calculation:**
1.  **Identify Available Information:** Look for nutritional values per 100g (raw), total raw weight, total cooked weight, and final portion weight.
2.  **Handling Missing Nutrients:** If the user does NOT provide nutritional values for the raw product (e.g., "calories per 100g"), try to use your internal knowledge to find average values for that specific food item.
3.  **Calculation Steps:**
    a. Determine the nutritional values per 100g (either provided by user or found in your knowledge).
    b. Identify the total weight of the *raw* product.
    c. Identify the total weight of the product *after cooking*.
    d. Identify the weight of the final *portion* the user will eat. This is the 'portionWeight'.
    e. Calculate the total nutrients for the entire raw package: \`(nutrients per 100g) * (raw package weight / 100)\`.
    f. Calculate the nutrient density of the cooked product: \`(total nutrients from step e) / (total cooked weight)\`.
    g. Calculate the final nutrients for the user's portion: \`(nutrient density from step f) * (portion weight)\`.
    h. Create a short, sensible description for the calculated meal.

**Error Handling:** Only return an error description (starting with "ERROR:") if you are completely unable to identify the food item or if critical weight ratios are missing and cannot be reasonably estimated.

Return ONLY the calculated values for the final portion, the portion weight, and the description in the specified JSON format. Do not respond with any conversational text.
`,
});

const portionCalculatorFlow = ai.defineFlow(
  {
    name: 'portionCalculatorFlow',
    inputSchema: PortionCalculatorInputSchema,
    outputSchema: PortionCalculatorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI model could not calculate the nutritional information.');
    }
    return output;
  }
);
