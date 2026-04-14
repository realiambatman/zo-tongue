import { SupportedLanguage, StudyData } from "../types";

// Backend API base URL - adjust this based on your deployment
// In production, set VITE_API_URL environment variable to your backend URL
// Example: VITE_API_URL=https://api.sensix.gensifts.com/api/chat
// Or if backend is on same domain: VITE_API_URL=/api/chat
// Optimize: cache the API base URL to avoid recomputing on every module load
let cachedApiBaseUrl: string | null = null;

const getApiBaseUrl = (): string => {
  // Return cached value if available
  if (cachedApiBaseUrl !== null) {
    return cachedApiBaseUrl;
  }

  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    cachedApiBaseUrl = import.meta.env.VITE_API_URL;
    return cachedApiBaseUrl;
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
    // SECURITY: Only log in development
    if (import.meta.env.DEV) {
      console.log(`Using production API URL: ${productionUrl}`);
      console.warn(
        "If backend is on different domain, set VITE_API_URL environment variable"
      );
    }
    cachedApiBaseUrl = productionUrl;
    return cachedApiBaseUrl;
  }

  // Development: default to localhost
  cachedApiBaseUrl = "http://localhost:3001/api/chat";
  return cachedApiBaseUrl;
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
   * Optimized: supports request cancellation via AbortController
   */
  async sendChatMessage(
    message: string,
    history: ChatHistoryItem[],
    language: SupportedLanguage,
    sarcasmMode: boolean = false,
    useSearch: boolean = false,
    currentDateTime?: string,
    signal?: AbortSignal
  ): Promise<{
    text: string;
    thoughts?: string;
    usage?: any;
    sources?: Array<{ title: string; url: string }>;
  }> {
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
        useSearch,
        currentDateTime,
      }),
      signal, // Support request cancellation
    });

    if (!response.ok) {
      // Optimize: only parse JSON if response has content
      let error: { error?: string } = { error: "Unknown error" };
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          error = await response.json();
        } catch {
          // Fallback to default error
        }
      }

      // Handle 503 overload errors specially
      if (response.status === 503) {
        throw new Error(
          error.error ||
            "The AI service is temporarily overloaded. Please try again in a moment."
        );
      }

      throw new Error(error.error || "Failed to send message");
    }

    const result = await response.json();

    // Validate response has text
    if (!result.text || result.text.trim().length === 0) {
      throw new Error("AI generated empty response. Please try again.");
    }

    return result;
  },

  /**
   * Translate text from one language to another
   * Optimized: supports request cancellation
   */
  async translateText(
    text: string,
    sourceLang: SupportedLanguage,
    targetLang: SupportedLanguage,
    signal?: AbortSignal
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
      signal, // Support request cancellation
    });

    if (!response.ok) {
      // Optimize: only parse JSON if response has content
      let error: { error?: string } = { error: "Unknown error" };
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          error = await response.json();
        } catch {
          // Fallback to default error
        }
      }
      throw new Error(error.error || "Failed to translate text");
    }

    return response.json();
  },

  /**
   * Generate study material from text
   * Optimized: supports request cancellation
   */
  async generateStudyMaterial(
    text: string,
    targetLang: SupportedLanguage,
    signal?: AbortSignal
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
      signal, // Support request cancellation
    });

    if (!response.ok) {
      // Optimize: only parse JSON if response has content
      let error: { error?: string } = { error: "Unknown error" };
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          error = await response.json();
        } catch {
          // Fallback to default error
        }
      }
      throw new Error(error.error || "Failed to generate study material");
    }

    return response.json();
  },

  /**
   * Solve multimodal problems (with optional image)
   * Optimized: supports request cancellation
   */
  async solveMultimodal(
    imageBase64: string | null,
    mimeType: string | null,
    question: string,
    outputLanguage: SupportedLanguage,
    signal?: AbortSignal
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
      signal, // Support request cancellation
    });

    if (!response.ok) {
      // Optimize: only parse JSON if response has content
      let error: { error?: string } = { error: "Unknown error" };
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          error = await response.json();
        } catch {
          // Fallback to default error
        }
      }
      throw new Error(error.error || "Failed to solve problem");
    }

    return response.json();
  },
};
