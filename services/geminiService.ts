import { Chat, Content } from "@google/genai";
import { SupportedLanguage, StudyData } from "../types";
import { apiClient, ChatHistoryItem } from "./apiClient";

/**
 * SECURE: Chat session wrapper that uses the backend API
 * All API keys and system instructions are now on the server
 */
class SecureChatSession {
  private language: SupportedLanguage;
  private sarcasmMode: boolean;
  private history: ChatHistoryItem[] = [];
  public id: string;

  constructor(
    language: SupportedLanguage,
    history?: Content[],
    sarcasmMode?: boolean
  ) {
    this.language = language;
    this.sarcasmMode = sarcasmMode || false;
    this.id = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Convert Content[] to ChatHistoryItem[]
    if (history) {
      this.history = history.map((item) => ({
        role: item.role === "user" ? "user" : "model",
        parts: item.parts?.map((p: any) => ({ text: p.text || "" })) || [
          { text: "" },
        ],
      }));
    }
  }

  async sendMessageStream(options: {
    message: string;
  }): Promise<AsyncGenerator<any, void, unknown>> {
    const userMessage: ChatHistoryItem = {
      role: "user",
      parts: [{ text: options.message }],
    };

    // Add user message to history
    this.history.push(userMessage);

    // Call backend API
    const response = await apiClient.sendChatMessage(
      options.message,
      this.history.slice(0, -1), // Send history without the current message
      this.language,
      this.sarcasmMode
    );

    // Add model response to history
    const modelMessage: ChatHistoryItem = {
      role: "model",
      parts: [{ text: response.text }],
    };
    this.history.push(modelMessage);

    // Simulate streaming by yielding text character by character
    // Fixed: Yield ONLY new characters, UI will accumulate
    async function* streamGenerator() {
      const fullText = response.text || "";
      const usageMetadata = response.usage;

      // Yield text in small chunks - each chunk contains ONLY new characters
      const chunkSize = 2;
      let previousEnd = 0;

      for (let i = 0; i < fullText.length; i += chunkSize) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        const endIndex = Math.min(i + chunkSize, fullText.length);
        const newChunk = fullText.substring(previousEnd, endIndex); // ONLY new chars
        previousEnd = endIndex;

        yield {
          text: newChunk,
        };
      }

      // Final yield with usage metadata (no text)
      if (usageMetadata) {
        yield {
          text: "",
          usageMetadata: usageMetadata,
        };
      }
    }

    return streamGenerator();
  }

  async getHistory(): Promise<Content[]> {
    // Convert ChatHistoryItem[] back to Content[]
    return this.history.map((item) => ({
      role: item.role,
      parts: item.parts.map((p) => ({ text: p.text })),
    }));
  }
}

export const createChatSession = (
  language: SupportedLanguage,
  history?: Content[],
  sarcasmMode?: boolean
): Chat => {
  // Return a SecureChatSession that mimics the Chat interface
  return new SecureChatSession(
    language,
    history,
    sarcasmMode
  ) as unknown as Chat;
};

/**
 * SECURE: Translation now goes through backend API
 */
export const translateText = async (
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<{ text: string; usage?: any }> => {
  try {
    return await apiClient.translateText(text, sourceLang, targetLang);
  } catch (error) {
    console.error("Translation error:", error);
    return { text: "Error: Failed to connect to translation service." };
  }
};

/**
 * SECURE: Study material generation now goes through backend API
 */
export const generateStudyMaterial = async (
  text: string,
  targetLang: SupportedLanguage
): Promise<{ data: StudyData; usage?: any }> => {
  try {
    return await apiClient.generateStudyMaterial(text, targetLang);
  } catch (error) {
    console.error("Study generation error:", error);
    throw error;
  }
};

/**
 * SECURE: Multimodal solving now goes through backend API
 */
export const solveMultimodal = async (
  imageBase64: string | null,
  mimeType: string | null,
  question: string,
  outputLanguage: SupportedLanguage
): Promise<{ text: string; usage?: any }> => {
  try {
    return await apiClient.solveMultimodal(
      imageBase64,
      mimeType,
      question,
      outputLanguage
    );
  } catch (error) {
    console.error("Solver error:", error);
    return { text: "Failed to process the request. Please try again." };
  }
};
