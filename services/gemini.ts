
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { ComparisonResult } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDocuments = async (doc1: string | { data: string, mimeType: string }, doc2: string | { data: string, mimeType: string }): Promise<ComparisonResult> => {
  const parts: any[] = [];
  
  if (typeof doc1 === 'string') parts.push({ text: `Document 1 Content: ${doc1}` });
  else parts.push({ inlineData: doc1 });

  if (typeof doc2 === 'string') parts.push({ text: `Document 2 Content: ${doc2}` });
  else parts.push({ inlineData: doc2 });

  // Use the correct single content object structure for generateContent
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: {
      parts: [
        ...parts,
        { text: `
          You are an elite legal AI specializing in high-stakes contract negotiation. 
          Perform a deep-dive semantic comparison between these two documents.
          
          Focus areas:
          1. Liability & Indemnification: Look for subtle changes in "gross negligence" vs "negligence".
          2. Intellectual Property: Check for ownership transfers or hidden licenses.
          3. Termination: Identify "for convenience" vs "for cause" shifts.
          4. Risks: Categorize by business impact.
          
          Return a JSON structure matching the required schema. Ensure 'clauseAnalysis' items include a 'category'.
        `}
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          criticalChanges: { type: Type.ARRAY, items: { type: Type.STRING } },
          risks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                severity: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
                category: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                impact: { type: Type.STRING }
              },
              required: ["severity", "category", "title", "description", "impact"]
            }
          },
          clauseAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                clauseTitle: { type: Type.STRING },
                category: { type: Type.STRING },
                doc1Text: { type: Type.STRING },
                doc2Text: { type: Type.STRING },
                significance: { type: Type.STRING }
              },
              required: ["clauseTitle", "category", "doc1Text", "doc2Text", "significance"]
            }
          }
        },
        required: ["summary", "recommendation", "risks", "clauseAnalysis", "criticalChanges"]
      }
    }
  });

  try {
    // Access .text property directly (not as a function call)
    const text = response.text || "";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    throw new Error("The legal analysis failed to return the expected structured format.");
  }
};

export const createCounselChat = (context: ComparisonResult): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are JurisCompare AI Interactive Counsel. You have just completed a deep analysis of two legal documents. 
      The summary was: ${context.summary}. 
      Key risks found: ${context.risks.map(r => r.title).join(', ')}.
      Answer user questions about these documents with precision, citing specific clauses from your previous analysis where possible. 
      Be concise, professional, and highlight hidden legal traps.`,
    },
  });
};
