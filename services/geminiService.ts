import { Chat, Content } from "@google/genai";
import { SupportedLanguage, StudyData } from "../types";
import { apiClient, ChatHistoryItem } from "./apiClient";

// Fetch real-time data from a time server to prevent stale client-side dates
// Retries up to 2 times as the API often fails on first attempt
export const fetchServerTime = async (retryCount = 0): Promise<string> => {
  const MAX_RETRIES = 2;

  try {
    // Set a short timeout to ensure the UI doesn't hang if the time API is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(
        "https://worldtimeapi.org/api/timezone/Asia/Kolkata",
        {
          signal: controller.signal,
          cache: "no-cache", // Ensure fresh data
        }
      );

      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        // Return full datetime string in ISO format
        return data.datetime;
      } else {
        // If response not ok, throw to trigger retry
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (primaryError) {
      clearTimeout(timeoutId);

      // Retry if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        // Wait a bit before retrying (exponential backoff: 500ms, 1000ms)
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (retryCount + 1))
        );
        return fetchServerTime(retryCount + 1);
      }

      // If primary API failed after retries, try fallback API
      try {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(
          () => fallbackController.abort(),
          2000
        );
        const fallbackResponse = await fetch(
          "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata",
          {
            signal: fallbackController.signal,
            cache: "no-cache",
          }
        );
        clearTimeout(fallbackTimeout);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          // Format as ISO string
          return new Date(fallbackData.dateTime).toISOString();
        }
      } catch (fallbackError) {
        // Both APIs failed, will use local time
      }
    }
  } catch (error) {
    // Only log warning on final failure (not on retries)
    if (retryCount >= MAX_RETRIES) {
      console.warn(
        "Failed to fetch server time after retries, falling back to local time."
      );
    }
  }

  // Fallback to local system time if API fails
  // Format it properly for IST timezone
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().replace("Z", "+05:30");
};

// Helper to detect if query is about date/time
export const isDateTimeQuery = (query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  const dateTimeKeywords = [
    "date",
    "time",
    "today",
    "now",
    "current date",
    "current time",
    "what day",
    "what time",
    "when is",
    "what is the date",
    "what is the time",
    "date today",
    "time now",
    "current day",
    "day today",
    "year",
    "month",
    "week",
    "hour",
    "minute",
  ];
  return dateTimeKeywords.some((keyword) => lowerQuery.includes(keyword));
};

// Helper to detect if query is about current events/news (works in English and native languages)
export const isCurrentEventsQuery = (query: string): boolean => {
  const lowerQuery = query.toLowerCase().trim();

  // Exclude common greetings and simple questions
  const greetingPatterns = [
    /^how\s+are\s+you/i,
    /^how\s+do\s+you\s+do/i,
    /^how\s+is\s+it\s+going/i,
    /^how\s+are\s+things/i,
    /^what's\s+up/i,
    /^what\s+is\s+up/i,
    /^hi\s*$/i,
    /^hello\s*$/i,
    /^hey\s*$/i,
    /^greetings/i,
    /^good\s+(morning|afternoon|evening)/i,
  ];

  // If it's just a greeting, don't search
  if (greetingPatterns.some((pattern) => pattern.test(lowerQuery))) {
    return false;
  }

  // English keywords (must be more specific)
  const englishKeywords = [
    "news",
    "latest news",
    "recent news",
    "current events",
    "happening now",
    "what happened",
    "breaking news",
    "today's news",
    "current news",
    "what's happening",
    "what happened today",
    "current affairs",
    "recent events",
    "latest updates",
    "breaking",
    "news today",
    "what's new",
    "what is happening",
    "current situation",
    "recent developments",
  ];

  // Check English keywords (exact matches or phrases)
  if (englishKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    return true;
  }

  // More specific patterns that indicate current events queries
  // Exclude simple "how are you" type questions
  const eventPatterns = [
    // Questions about specific people/entities (but not "how are you")
    /\b(who|what|when|where|why)\s+(is|are|was|were|did|does|will|happened|happening)\s+(?!you|your|yours)\w+/i,
    // Questions about current status with context
    /\b(current|latest|recent|new|today|now)\s+(news|events|updates|developments|situation|affairs)/i,
    // Questions about specific events/incidents
    /\b(about|regarding|concerning|tell me about|explain)\s+(.*?)\b/i,
    // Questions with time indicators and context
    /\b(today|yesterday|this week|this month|now|currently)\s+(.*?)(news|event|happened|happening)/i,
  ];

  // Check for event patterns (works in any language)
  if (eventPatterns.some((pattern) => pattern.test(query))) {
    return true;
  }

  // Check for queries about specific entities (names, places, organizations)
  // Only if query is long enough and has context
  const hasSpecificEntity =
    query.length > 20 && // Longer queries are more likely to be about events
    (query.includes("?") || query.includes("bang") || query.includes("eng")) && // Question indicators
    !lowerQuery.match(
      /^(how|what|who|when|where)\s+(are|is|do|does)\s+(you|your|yours)/i
    ); // Exclude personal questions

  // If query is asking about something specific and is a question, likely current events
  if (
    hasSpecificEntity &&
    (query.includes("?") || query.match(/\b(bang|eng|what|who|when|where)\b/i))
  ) {
    return true;
  }

  return false;
};

/**
 * Helper function to clean and validate chat history
 * Filters out items with empty parts or empty text strings
 */
const cleanHistory = (history: ChatHistoryItem[]): ChatHistoryItem[] => {
  return history
    .filter((item) => {
      // Filter out items with no parts or empty parts array
      if (!item.parts || item.parts.length === 0) return false;
      // Keep items that have at least one part with non-empty text
      return item.parts.some(
        (part) => part.text && part.text.trim().length > 0
      );
    })
    .map((item) => ({
      role: item.role,
      // Filter out empty text parts within each item
      parts: item.parts.filter(
        (part) => part.text && part.text.trim().length > 0
      ),
    }));
};

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

    // Convert Content[] to ChatHistoryItem[] and clean invalid items
    if (history) {
      const convertedHistory: ChatHistoryItem[] = history
        .map((item) => ({
          role: (item.role === "user" ? "user" : "model") as "user" | "model",
          parts: item.parts?.map((p: any) => ({ text: p.text || "" })) || [
            { text: "" },
          ],
        }))
        .filter((item): item is ChatHistoryItem => {
          return (
            (item.role === "user" || item.role === "model") &&
            Array.isArray(item.parts)
          );
        });
      // Clean history to remove empty/invalid items
      this.history = cleanHistory(convertedHistory);
    }
  }

  async sendMessageStream(options: {
    message: string;
    useSearch?: boolean;
    currentDateTime?: string;
    currentHistory?: ChatHistoryItem[]; // Allow passing fresh history from database
  }): Promise<AsyncGenerator<any, void, unknown>> {
    const userMessage: ChatHistoryItem = {
      role: "user",
      parts: [{ text: options.message }],
    };

    // Use provided current history if available (from database), otherwise use local history
    // This ensures we always use the latest history when multiple users are in the same session
    const baseHistory = options.currentHistory || this.history;

    // Create a snapshot of history at this point to avoid race conditions with concurrent messages
    // This ensures each message gets the correct context even if multiple are sent simultaneously
    const historySnapshot = [...baseHistory];

    // Clean the history snapshot to ensure no empty/invalid items are sent to backend
    const cleanedHistory = cleanHistory(historySnapshot);

    // Add user message to the snapshot (not to main history yet)
    const historyWithUserMessage = [...cleanedHistory, userMessage];

    // Call backend API with the cleaned snapshot
    const response = await apiClient.sendChatMessage(
      options.message,
      cleanedHistory, // Send cleaned history snapshot without the current message
      this.language,
      this.sarcasmMode,
      options.useSearch || false,
      options.currentDateTime
    );

    // Add both user message and model response to main history atomically
    // This ensures proper ordering even with concurrent requests
    const modelMessage: ChatHistoryItem = {
      role: "model",
      parts: [{ text: response.text }],
    };

    // Update local history to stay in sync
    // If we used currentHistory from options, merge it with the new messages
    // Otherwise, just append to existing history
    if (options.currentHistory) {
      // Replace history with the provided history + new messages
      this.history = [...options.currentHistory, userMessage, modelMessage];
    } else {
      // Use a simple append strategy - in a real concurrent scenario, you might want
      // to use a queue or lock, but for most use cases this works fine
      this.history.push(userMessage);
      this.history.push(modelMessage);
    }

    // Simulate streaming by yielding text character by character
    // Fixed: Yield ONLY new characters, UI will accumulate
    async function* streamGenerator() {
      const fullText = response.text || "";
      const thoughts = response.thoughts;
      const usageMetadata = response.usage;
      const sources = response.sources;

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

      // Final yield with usage metadata and sources (no text)
      yield {
        text: "",
        thoughts: thoughts,
        usageMetadata: usageMetadata,
        sources: sources,
      };
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
): Promise<{ text: string; usage?: any; thoughts?: string }> => {
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
): Promise<{ data: StudyData; usage?: any; thoughts?: string }> => {
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
): Promise<{ text: string; usage?: any; thoughts?: string }> => {
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
