import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const getApiKey = () => {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY
  ];

  for (const key of keys) {
    if (key && key.startsWith('AIza') && key.length > 20) {
      return key;
    }
  }
  return undefined;
};

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: getApiKey(),
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
