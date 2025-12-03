import {
  GoogleGenAI as AIClient,
  Chat,
  Type,
  ThinkingLevel,
  Content,
} from "@google/genai";
import { SupportedLanguage, StudyData } from "../types";
import { MODEL_NAME } from "../constants";

// Initialize AI Client
const ai = new AIClient({
  apiKey: "REDACTED",
});
// Optimized for Gemini 3 Pro Preview
// Reference: https://ai.google.dev/gemini-api/docs/gemini-3

export const createChatSession = (
  language: SupportedLanguage,
  history?: Content[],
  sarcasmMode?: boolean
): Chat => {
  // Precise, concise instructions for Gemini 3
  const baseInstruction = `
    LANGUAGE: ${language} — THIS IS YOUR ONLY OUTPUT LANGUAGE NOW.
    - Even if chat history has other languages, you MUST respond ONLY in ${language} from now on.
    - Use history for context/understanding, but ALWAYS reply in ${language}.
    - Wrong language input → English reply: "That is not the selected language. Please speak in ${language}."
    - English greetings are fine, but you MUST reply in ${language}. English greetings like "hello", "hi", etc. are permitted as input, but your reply MUST be in ${language} with an appropriate greeting/response.
    - Greetings okay. Zo/Kuki-Chin culture. Markdown. Math: $...$, $$...$$.
    - Identity: "AI model, application and functions created by Sensix" only if asked. Never say Google/Gemini.
  `;

  const sarcasmInstruction = `
    SARCASM MODE (still speak ${language}!): Be sarcastic, short (1-3 sentences), roast playfully. Never use emoji but use this emoji only sometime 💀. First reply: mention they can turn off sarcasm via toggle.
  `;

  const systemInstruction = sarcasmMode
    ? `${baseInstruction}\n${sarcasmInstruction}`
    : baseInstruction;

  return ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: systemInstruction,
      // Removed temperature as per Gemini 3 docs (defaults to 1.0 for best reasoning)
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW, // Low for faster responses
      },
    },
    history: history,
  });
};

export const translateText = async (
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<{ text: string; usage?: any }> => {
  const prompt = `
    Task: Translate text from ${sourceLang} to ${targetLang}.
    Input: "${text}"
    Rules:
    1. If input is NOT ${sourceLang}, return: "Error: The input text is not in ${sourceLang}."
    2. Else, return natural translation in ${targetLang}.
    3. Output ONLY translation or error.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    return {
      text: response.text || "Error: No response generated.",
      usage: response.usageMetadata,
    };
  } catch (error) {
    console.error("Translation error:", error);
    return { text: "Error: Failed to connect to translation service." };
  }
};

export const generateStudyMaterial = async (
  text: string,
  targetLang: SupportedLanguage
): Promise<{ data: StudyData; usage?: any }> => {
  const prompt = `
    Task: Create study material in ${targetLang} for input: "${text}".
    Requirements:
    1. "summary": Concise paragraph summary in ${targetLang} (Markdown allowed).
    2. "questions": 3-5 Q&A pairs in ${targetLang} based on text.
    Output: Valid JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "The summary of the text.",
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                },
              },
            },
          },
        },
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response generated");
    return {
      data: JSON.parse(jsonText) as StudyData,
      usage: response.usageMetadata,
    };
  } catch (error) {
    console.error("Study generation error:", error);
    throw error;
  }
};

export const solveMultimodal = async (
  imageBase64: string | null,
  mimeType: string | null,
  question: string,
  outputLanguage: SupportedLanguage
): Promise<{ text: string; usage?: any }> => {
  const parts: any[] = [];

  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    });
  }

  const promptText = `
    Role: Expert Tutor. Output: ${outputLanguage}.
    Task: Solve problem in image/text.
    Rules:
    1. Math: Step-by-step solution. Use LaTeX ($...$ or $$...$$). No bold inside LaTeX. No \\( \\).
    2. MCQ: State correct option and explanation.
    3. Format: Markdown.
    4. Identity: Never mention Google/Gemini.
    Context: "${question}"
  `;

  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    return {
      text: response.text || "I couldn't solve this problem.",
      usage: response.usageMetadata,
    };
  } catch (error) {
    console.error("Solver error:", error);
    return { text: "Failed to process the request. Please try again." };
  }
};
