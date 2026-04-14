export enum AppMode {
  CHAT = "CHAT",
  TRANSLATE = "TRANSLATE",
  STUDY = "STUDY",
  SOLVER = "SOLVER",
}

export enum SessionType {
  CHAT = "CHAT",
  TRANSLATE = "TRANSLATE",
  STUDY = "STUDY",
  SOLVER = "SOLVER",
}

export enum SupportedLanguage {
  English = "English",
  Paite = "Paite",
  Thadou = "Thadou",
  Hmar = "Hmar",
  Vaiphei = "Vaiphei",
  Mizo = "Mizo",
  Zou = "Zou",
  Kom = "Kom",
  Gangte = "Gangte",
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  isError?: boolean;
  isSystem?: boolean;
  isAdminReply?: boolean; // New flag for admin replies
  image?: string; // Base64 or URL for solver images
  thoughts?: string; // Optional reasoning/thought text if backend provides it
  usage?: {
    thoughtsTokenCount?: number;
    candidatesTokenCount?: number;
    promptTokenCount?: number;
    totalTokenCount?: number;
  };
  sources?: Array<{ title: string; url: string }>; // Sources from web search
  isSearching?: boolean; // Visual indicator for search in progress
}

export interface TranslationResult {
  original: string;
  translated: string;
  error?: string;
}

export interface StudyData {
  summary: string;
  questions: {
    question: string;
    answer: string;
  }[];
}
