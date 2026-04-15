import type { ChatMessage } from "../types";

/**
 * Opening tags models may emit (Gemini prompt uses redacted_thinking; some models
 * emit a plain think block).
 */
const THINK_OPEN = /(?:<redacted_thinking>|<think>)/i;

/** Closing tags we accept for the reasoning block. */
const THINK_CLOSE = /(?:<\/redacted_thinking>|<\/think>)/i;

/**
 * Extract reasoning from model text and return visible answer only.
 * Handles complete blocks and streaming (unclosed tag).
 */
export function extractThinkBlockFromModelText(text: string): {
  thoughts?: string;
  cleanedText: string;
} {
  if (!text) return { cleanedText: "" };

  const openMatch = text.match(THINK_OPEN);
  if (!openMatch || openMatch.index === undefined) {
    return { cleanedText: text };
  }

  const openEnd = openMatch.index + openMatch[0].length;
  const afterOpen = text.slice(openEnd);
  const closeMatch = afterOpen.match(THINK_CLOSE);

  if (closeMatch && closeMatch.index !== undefined) {
    const thoughts = afterOpen.slice(0, closeMatch.index).trim();
    const afterClose = afterOpen.slice(
      closeMatch.index + closeMatch[0].length,
    );
    const cleanedText = (text.slice(0, openMatch.index) + afterClose).trim();
    return {
      thoughts: thoughts || undefined,
      cleanedText: cleanedText || "",
    };
  }

  // Streaming / unclosed block
  const thoughts = afterOpen.trim();
  const cleanedText = text.slice(0, openMatch.index).trim();
  return {
    thoughts: thoughts || undefined,
    cleanedText,
  };
}

/** For UI: strip tags from msg.text; merge persisted msg.thoughts when present. */
export function getModelMessageParts(msg: ChatMessage): {
  displayText: string;
  thoughtsText?: string;
} {
  if (msg.role !== "model" || msg.isSystem) {
    return { displayText: msg.text };
  }
  const { thoughts: parsedThoughts, cleanedText } =
    extractThinkBlockFromModelText(msg.text);
  const persisted = msg.thoughts?.trim();
  const thoughtsText = persisted || parsedThoughts || undefined;
  return {
    displayText: cleanedText,
    thoughtsText,
  };
}
