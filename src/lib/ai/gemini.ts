import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY);

export async function generateRecommendations(userContext: any) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Based on this user's data:
    - Habits: ${JSON.stringify(userContext.habits)}
    - Recent activity: ${JSON.stringify(userContext.recentActivity)}
    
    Generate 3 personalized recommendations for improving their life.
    Return as JSON array with title, description, and actionType fields.
  `;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  
  try {
    return JSON.parse(response.text());
  } catch {
    return [];
  }
}
