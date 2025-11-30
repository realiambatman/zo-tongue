import { GoogleGenAI, Chat, Type, ThinkingLevel } from "@google/genai";
import { SupportedLanguage, StudyData } from "../types";
import { MODEL_NAME } from "../constants";

// Initialize Gemini API Client
const ai = new GoogleGenAI({
  apiKey: "REDACTED",
});

export const createChatSession = (language: SupportedLanguage): Chat => {
  const systemInstruction = `
    You are a helpful, native-level AI assistant fluent in ${language}.
    
    CRITICAL RULES:
    1. You must ONLY speak in ${language}. Never strictly switch to English for conversation unless instructing the user about the language error.
    2. You must detect the language of the USER's input.
    3. If the user's input is NOT in ${language} (and is not a universal greeting or ambiguous short phrase), you must REFUSE to answer in the user's language.
    4. Instead, reply exactly in English with: "That is not the selected language. Please speak in ${language}."
    5. If the user speaks ${language}, reply helpfully and fluently in ${language}.
    6. Be culturally sensitive to the nuances of the ${language} language (Zo/Kuki-Chin-Mizo family).
    7. FORMATTING: Use Markdown. For Math/Equations, use standard LaTeX format enclosed in single $ for inline (e.g. $x^2$) or double $$ for block (e.g. $$E=mc^2$$). Do NOT use \\( \\) or \\[ \\].
    8. IDENTITY QUESTIONS: When asked about who created you, who you are, or who created the application (questions like "who created you?", "who are you?", "created by?", "who made you?", "who made this app?", etc.), you must reply in ${language} stating: "I am an AI model. This application and its functions are created by Sensix."
  `;

  return ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.4,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH, // Use high thinking level for better reasoning
      },
    },
  });
};

export const translateText = async (
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<{ text: string; usage?: any }> => {
  const prompt = `
    Role: Strict Language Translator.
    Task: Translate the following text from ${sourceLang} to ${targetLang}.
    
    Input Text: "${text}"

    STRICT RULES:
    1. Analyze the Input Text.
    2. If the Input Text is CLEARLY NOT in ${sourceLang}, DO NOT TRANSLATE.
    3. Instead, return EXACTLY this error message in English: "Error: The input text is not in ${sourceLang}."
    4. If the text is in ${sourceLang}, provide the most natural and accurate translation in ${targetLang}.
    5. Only output the translation or the error message. Do not add explanations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW, // Use low thinking level for faster responses
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
    Task: Educational Analysis.
    Input Text: "${text}"
    Target Output Language: ${targetLang}
    
    Requirements:
    1. Summary: Provide a clear, concise paragraph explanation/summary of the input text, written in ${targetLang}. Use Markdown formatting (bold, italic) if needed.
    2. Q&A: Generate 3-5 relevant study questions based on the text, with their correct answers, all written in ${targetLang}.
    
    Output must be valid JSON.
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
          thinkingLevel: ThinkingLevel.LOW, // Use low thinking level for faster responses
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
    Role: Expert Tutor and Problem Solver.
    Output Language: ${outputLanguage}.
    
    Task: Solve the problem presented in the image and/or text.
    
    Instructions:
    1. If it's a math problem, show the step-by-step solution clearly.
    2. If it's a multiple choice question, provide the correct option and explain why.
    3. Use Markdown for structure (bold key terms, lists for steps).
    4. CRITICAL FOR MATH: Use LaTeX formatting for all math expressions.
       - Enclose inline math in single dollar signs, e.g., $x = 5$.
       - Enclose block equations in double dollar signs, e.g., $$ a^2 + b^2 = c^2 $$.
       - Do NOT use Markdown bolding (**) inside the LaTeX math block.
       - Do NOT use \\( or \\[ delimiters.
    
    User Question/Context: "${question}"
  `;

  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW, // Use low thinking level for faster responses
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
