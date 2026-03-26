import { GoogleGenAI, Type } from "@google/genai";
import { PortfolioChange, AIAnalysisResult } from "../types";

const apiKey = process.env.API_KEY || '';

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzePortfolioChange = async (change: PortfolioChange): Promise<AIAnalysisResult> => {
  if (!ai) {
    return {
      analysis: "API Key is missing. Cannot perform AI analysis.",
      sentiment: "Neutral"
    };
  }

  const addedNames = change.added.map(s => `${s.name} (${s.symbol})`).join(', ');
  const removedNames = change.removed.map(s => `${s.name} (${s.symbol})`).join(', ');
  const movedUpNames = change.movedUp
    .map(item => `${item.stock.name} (${item.stock.symbol}) #${item.previousRank}→#${item.currentRank}`)
    .join(', ');
  const movedDownNames = change.movedDown
    .map(item => `${item.stock.name} (${item.stock.symbol}) #${item.previousRank}→#${item.currentRank}`)
    .join(', ');
  
  if (
    change.added.length === 0 &&
    change.removed.length === 0 &&
    change.movedUp.length === 0 &&
    change.movedDown.length === 0
  ) {
    return {
      analysis: "No changes detected in the portfolio today. The investor is holding their position.",
      sentiment: "Neutral"
    };
  }

  const prompt = `
    You are a professional financial analyst tracking a high-profile investor's portfolio (Smart Money).
    
    The investor made the following changes on ${new Date(change.date).toLocaleDateString()}:
    
    ADDED STOCKS: ${addedNames || 'None'}
    REMOVED STOCKS: ${removedNames || 'None'}
    RANKING UP (higher priority signal, not proof of bullishness): ${movedUpNames || 'None'}
    RANKING DOWN (lower priority signal, not proof of bearishness): ${movedDownNames || 'None'}
    
    Please provide a concise analysis (max 100 words) of what this shift might imply about their strategy.
    Treat ranking changes as an attention or priority signal only. Do not equate ranking up directly with bullishness or ranking down directly with bearishness.
    Weigh ranking changes together with additions and removals when inferring strategy.
    
    Also classify the sentiment of this move as: Bullish, Bearish, Neutral, or Defensive.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral', 'Defensive'] }
          },
          required: ['analysis', 'sentiment']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      analysis: "Failed to analyze portfolio changes due to an API error.",
      sentiment: "Neutral"
    };
  }
};
