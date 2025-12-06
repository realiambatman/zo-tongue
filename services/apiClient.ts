import { SupportedLanguage, StudyData } from "../types";

// Backend API base URL - adjust this based on your deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api/gemini";

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

/**
 * Secure API client - all Gemini API calls go through the backend
 * This prevents exposing API keys and system instructions to clients
 */
export const apiClient = {
  /**
   * Send a message to the chat and get a response
   */
  async sendChatMessage(
    message: string,
    history: ChatHistoryItem[],
    language: SupportedLanguage,
    sarcasmMode: boolean = false
  ): Promise<{ text: string; usage?: any }> {
    const response = await fetch(`${API_BASE_URL}/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history,
        language,
        sarcasmMode,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to send message");
    }

    return response.json();
  },

  /**
   * Translate text from one language to another
   */
  async translateText(
    text: string,
    sourceLang: SupportedLanguage,
    targetLang: SupportedLanguage
  ): Promise<{ text: string; usage?: any }> {
    const response = await fetch(`${API_BASE_URL}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to translate text");
    }

    return response.json();
  },

  /**
   * Generate study material from text
   */
  async generateStudyMaterial(
    text: string,
    targetLang: SupportedLanguage
  ): Promise<{ data: StudyData; usage?: any }> {
    const response = await fetch(`${API_BASE_URL}/study`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        targetLang,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to generate study material");
    }

    return response.json();
  },

  /**
   * Solve multimodal problems (with optional image)
   */
  async solveMultimodal(
    imageBase64: string | null,
    mimeType: string | null,
    question: string,
    outputLanguage: SupportedLanguage
  ): Promise<{ text: string; usage?: any }> {
    const response = await fetch(`${API_BASE_URL}/solve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        question,
        outputLanguage,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to solve problem");
    }

    return response.json();
  },
};

