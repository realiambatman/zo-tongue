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

export const MODEL_NAME = "gemini-3.1-pro-preview";

/** Matches AdminPanel + Firestore rules (`@buildnbit.com` admins). */
export const ADMIN_EMAIL_DOMAIN = "@buildnbit.com";

export function isPlatformAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN);
}
