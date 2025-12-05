import { SupportedLanguage } from "./types";

export const LANGUAGE_OPTIONS: SupportedLanguage[] = [
  SupportedLanguage.English,
  SupportedLanguage.Paite,
  SupportedLanguage.Thadou,
  SupportedLanguage.Hmar,
  // SupportedLanguage.Vaiphei, // Commented out - not good enough yet
  SupportedLanguage.Mizo,
  SupportedLanguage.Zou,
  SupportedLanguage.Kom,
  SupportedLanguage.Gangte,
];

export const MODEL_NAME = "gemini-3-pro-preview";

export const INITIAL_CHAT_MESSAGE = (lang: SupportedLanguage): string => {
  return `Chibai! I am your ${lang} assistant. I will only speak in ${lang}.`;
};
