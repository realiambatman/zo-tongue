import { SupportedLanguage, StudyData } from "../types";

// Backend API base URL - adjust this based on your deployment
// In production, set VITE_API_URL environment variable to your backend URL
// Example: VITE_API_URL=https://api.sensix.gensifts.com/api/chat
// Or if backend is on same domain: VITE_API_URL=/api/chat
const getApiBaseUrl = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In production (not localhost), try to use same origin
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    // Production: use same origin (assumes backend is proxied on same domain)
    // If backend is on different domain/port, you MUST set VITE_API_URL
    const productionUrl = `${window.location.origin}/api/chat`;
    console.log(`Using production API URL: ${productionUrl}`);
    console.warn(
      "If backend is on different domain, set VITE_API_URL environment variable"
    );
    return productionUrl;
  }

  // Development: default to localhost
  return "http://localhost:3001/api/chat";
};

const API_BASE_URL = getApiBaseUrl();

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
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
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
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
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
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
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
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to solve problem");
    }

    return response.json();
  },
};
