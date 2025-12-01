export enum AppMode {
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
  usage?: {
    thoughtsTokenCount?: number;
    candidatesTokenCount?: number;
    promptTokenCount?: number;
    totalTokenCount?: number;
  };
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
