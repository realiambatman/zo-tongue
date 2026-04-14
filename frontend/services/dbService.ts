import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { ChatMessage, SupportedLanguage, SessionType } from "../types";

export interface ChatSession {
  id: string;
  userId: string;
  userEmail?: string | null;
  title: string;
  language: SupportedLanguage;
  startTime: number;
  lastUpdated: number;
  messages: ChatMessage[];
  isAnonymous: boolean;
  isAiPaused?: boolean; // New flag to pause AI responses
  type?: SessionType;
  ipAddress?: string | null; // IP address for guest tracking
}

/**
 * Generate a short title from chat messages
 * Uses the first user message to create a concise title
 */
export const generateChatTitle = (
  messages: ChatMessage[],
  language: SupportedLanguage
): string => {
  // Find the first non-system, non-error user message
  const firstUserMessage = messages.find(
    (m) => m.role === "user" && !m.isSystem && !m.isError
  );

  if (!firstUserMessage || !firstUserMessage.text) {
    return `Chat in ${language}`;
  }

  const text = firstUserMessage.text.trim();

  // If message is very short, use it directly (up to 40 chars)
  if (text.length <= 40) {
    return text;
  }

  // For longer messages, take first few words (up to 5 words or 40 chars)
  const words = text.split(/\s+/);
  let title = "";
  for (let i = 0; i < Math.min(5, words.length); i++) {
    const candidate = i === 0 ? words[i] : title + " " + words[i];
    if (candidate.length <= 40) {
      title = candidate;
    } else {
      break;
    }
  }

  // If we have a title, add ellipsis if it's truncated
  if (title && title.length < text.length) {
    return title + "...";
  }

  // Fallback to language-based title
  return `Chat in ${language}`;
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  lastLogin: number;
}

export const saveUserProfile = async (user: UserProfile) => {
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, user, { merge: true });
  } catch (error) {
    console.error("Error saving user profile:", error);
  }
};

export const subscribeToAllUsers = (
  callback: (users: UserProfile[]) => void
): Unsubscribe => {
  const q = query(collection(db, "users"), orderBy("lastLogin", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map(
      (doc) => ({ uid: doc.id, ...doc.data() } as UserProfile)
    );
    callback(users);
  });
};

export const saveChatSession = async (session: ChatSession) => {
  try {
    const sessionRef = doc(db, "chats", session.id);

    // Clean messages to remove undefined values (Firestore doesn't allow undefined)
    const cleanedMessages = session.messages.map((msg) => {
      const cleaned: ChatMessage = {
        id: msg.id,
        role: msg.role,
        text: msg.text || "", // Ensure text is never undefined
        timestamp: msg.timestamp,
      };

      // Only include optional fields if they are defined and not null
      if (msg.isError !== undefined && msg.isError !== null)
        cleaned.isError = msg.isError;
      if (msg.isSystem !== undefined && msg.isSystem !== null)
        cleaned.isSystem = msg.isSystem;
      if (msg.isAdminReply !== undefined && msg.isAdminReply !== null)
        cleaned.isAdminReply = msg.isAdminReply;
      if (msg.image !== undefined && msg.image !== null)
        cleaned.image = msg.image;
      if (msg.thoughts !== undefined && msg.thoughts !== null)
        cleaned.thoughts = msg.thoughts;

      // Clean usage object to remove undefined values
      if (msg.usage !== undefined && msg.usage !== null) {
        const cleanedUsage: any = {};
        if (
          msg.usage.thoughtsTokenCount !== undefined &&
          msg.usage.thoughtsTokenCount !== null
        )
          cleanedUsage.thoughtsTokenCount = msg.usage.thoughtsTokenCount;
        if (
          msg.usage.candidatesTokenCount !== undefined &&
          msg.usage.candidatesTokenCount !== null
        )
          cleanedUsage.candidatesTokenCount = msg.usage.candidatesTokenCount;
        if (
          msg.usage.promptTokenCount !== undefined &&
          msg.usage.promptTokenCount !== null
        )
          cleanedUsage.promptTokenCount = msg.usage.promptTokenCount;
        if (
          msg.usage.totalTokenCount !== undefined &&
          msg.usage.totalTokenCount !== null
        )
          cleanedUsage.totalTokenCount = msg.usage.totalTokenCount;
        if (Object.keys(cleanedUsage).length > 0) {
          cleaned.usage = cleanedUsage;
        }
      }

      // Clean sources array
      if (
        msg.sources !== undefined &&
        msg.sources !== null &&
        Array.isArray(msg.sources)
      ) {
        const cleanedSources = msg.sources
          .filter((s) => s && s.title && s.url)
          .map((s) => ({ title: s.title, url: s.url }));
        if (cleanedSources.length > 0) {
          cleaned.sources = cleanedSources;
        }
      }

      if (msg.isSearching !== undefined && msg.isSearching !== null)
        cleaned.isSearching = msg.isSearching;

      return cleaned;
    });

    // Clean session object to remove undefined values
    const cleanedSession: any = {
      id: session.id,
      userId: session.userId,
      title: session.title || "New Chat", // Ensure title is never undefined
      language: session.language,
      startTime: session.startTime,
      lastUpdated: Date.now(),
      messages: cleanedMessages,
      isAnonymous:
        session.isAnonymous !== undefined ? session.isAnonymous : false,
    };

    // Only include optional fields if they are defined and not null
    if (session.userEmail !== undefined && session.userEmail !== null) {
      cleanedSession.userEmail = session.userEmail;
    }
    if (session.isAiPaused !== undefined && session.isAiPaused !== null) {
      cleanedSession.isAiPaused = session.isAiPaused;
    }
    if (session.type !== undefined && session.type !== null) {
      cleanedSession.type = session.type;
    }
    if (session.ipAddress !== undefined && session.ipAddress !== null) {
      cleanedSession.ipAddress = session.ipAddress;
    }

    // Remove any remaining undefined values recursively
    const removeUndefined = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) {
        return obj.map(removeUndefined).filter((item) => item !== undefined);
      }
      if (typeof obj === "object") {
        const cleaned: any = {};
        for (const key in obj) {
          if (obj[key] !== undefined) {
            cleaned[key] = removeUndefined(obj[key]);
          }
        }
        return cleaned;
      }
      return obj;
    };

    const finalCleanedSession = removeUndefined(cleanedSession);
    await setDoc(sessionRef, finalCleanedSession, { merge: true });
  } catch (error) {
    console.error("Error saving chat session:", error);
  }
};

export const deleteChatSession = async (sessionId: string) => {
  try {
    await deleteDoc(doc(db, "chats", sessionId));
  } catch (error) {
    console.error("Error deleting chat session:", error);
    throw error;
  }
};

export const createNewSession = async (
  userId: string,
  language: SupportedLanguage,
  userEmail?: string | null,
  isAnonymous: boolean = true,
  type: SessionType = SessionType.CHAT,
  title?: string,
  ipAddress?: string | null
): Promise<string> => {
  try {
    const sessionsRef = collection(db, "chats");
    const newSession: Partial<ChatSession> = {
      userId,
      userEmail: userEmail || null,
      title: title || `Chat in ${language}`,
      language,
      startTime: Date.now(),
      lastUpdated: Date.now(),
      messages: [],
      isAnonymous,
      type,
      ipAddress: ipAddress || null,
    };
    const docRef = await addDoc(sessionsRef, newSession);
    return docRef.id;
  } catch (error) {
    console.error("Error creating new session:", error);
    throw error;
  }
};

export const getUserSessions = async (
  userId: string
): Promise<ChatSession[]> => {
  try {
    const q = query(
      collection(db, "chats"),
      where("userId", "==", userId),
      orderBy("lastUpdated", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as ChatSession)
    );
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }
};

export const getAllSessions = async (): Promise<ChatSession[]> => {
  try {
    const q = query(collection(db, "chats"), orderBy("lastUpdated", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as ChatSession)
    );
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    return [];
  }
};

export const getSessionById = async (
  sessionId: string
): Promise<ChatSession | null> => {
  try {
    const docRef = doc(db, "chats", sessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ChatSession;
    }
    return null;
  } catch (error) {
    console.error("Error fetching session:", error);
    return null;
  }
};

export const subscribeToAllSessions = (
  callback: (sessions: ChatSession[]) => void
): Unsubscribe => {
  const q = query(collection(db, "chats"), orderBy("lastUpdated", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const sessions = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as ChatSession)
    );
    callback(sessions);
  });
};

export const subscribeToSession = (
  sessionId: string,
  callback: (session: ChatSession | null) => void
): Unsubscribe => {
  const docRef = doc(db, "chats", sessionId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as ChatSession);
    } else {
      callback(null);
    }
  });
};

export const addMessageToSession = async (
  sessionId: string,
  message: ChatMessage
) => {
  try {
    const sessionRef = doc(db, "chats", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      const currentMessages = sessionSnap.data().messages || [];
      await setDoc(
        sessionRef,
        {
          messages: [...currentMessages, message],
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error("Error adding message to session:", error);
    throw error;
  }
};

export const toggleAiPause = async (sessionId: string, isPaused: boolean) => {
  try {
    const sessionRef = doc(db, "chats", sessionId);
    await setDoc(
      sessionRef,
      {
        isAiPaused: isPaused,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error toggling AI pause:", error);
    throw error;
  }
};

/**
 * Delete a specific message from a chat session
 */
export const deleteMessageFromSession = async (
  sessionId: string,
  messageId: string
) => {
  try {
    const sessionRef = doc(db, "chats", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      const currentMessages = sessionSnap.data().messages || [];
      const updatedMessages = currentMessages.filter(
        (msg: ChatMessage) => msg.id !== messageId
      );

      await setDoc(
        sessionRef,
        {
          messages: updatedMessages,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error("Error deleting message from session:", error);
    throw error;
  }
};

// Fetch user's public IP address using a free service
export const fetchUserIP = async (): Promise<string | null> => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    if (response.ok) {
      const data = await response.json();
      return data.ip;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch IP address:", error);
    return null;
  }
};

/** Admin training-data export history (per signed-in admin account). */
export interface AdminExportHistoryEntry {
  at: string;
  fromDate?: string;
  toDate?: string;
  lang: string;
  format: string;
  mode: "range" | "sinceLastExact";
  basis: "lastUpdated" | "startTime";
  sessionCount: number;
}

const adminExportProfileRef = (uid: string) => doc(db, "adminExportProfiles", uid);

const LS_EXPORT_LAST_LEGACY = "zotongue_admin_last_export_iso";
const LS_EXPORT_HISTORY_LEGACY = "zotongue_admin_export_history";

async function migrateAdminExportFromLocalStorage(uid: string): Promise<void> {
  try {
    const snap = await getDoc(adminExportProfileRef(uid));
    const existing = snap.exists() ? snap.data() : null;
    if (
      existing?.lastExportAt ||
      (Array.isArray(existing?.history) && existing.history.length > 0)
    ) {
      return;
    }
    let lsLast: string | null = null;
    let lsHist: AdminExportHistoryEntry[] = [];
    try {
      lsLast = localStorage.getItem(LS_EXPORT_LAST_LEGACY);
      const raw = localStorage.getItem(LS_EXPORT_HISTORY_LEGACY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdminExportHistoryEntry[];
        if (Array.isArray(parsed)) lsHist = parsed;
      }
    } catch {
      /* ignore */
    }
    if (!lsLast && lsHist.length === 0) return;
    await setDoc(
      adminExportProfileRef(uid),
      {
        lastExportAt: lsLast || null,
        history: lsHist.slice(0, 30),
        migratedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error("migrateAdminExportFromLocalStorage:", e);
  }
}

export const fetchAdminExportProfile = async (
  uid: string
): Promise<{ lastExportAt: string | null; history: AdminExportHistoryEntry[] }> => {
  try {
    await migrateAdminExportFromLocalStorage(uid);
    const snap = await getDoc(adminExportProfileRef(uid));
    if (!snap.exists()) {
      return { lastExportAt: null, history: [] };
    }
    const d = snap.data();
    return {
      lastExportAt: (d.lastExportAt as string) || null,
      history: Array.isArray(d.history) ? d.history : [],
    };
  } catch (e) {
    console.error("fetchAdminExportProfile:", e);
    return { lastExportAt: null, history: [] };
  }
};

export const appendAdminExportHistory = async (
  uid: string,
  entry: Omit<AdminExportHistoryEntry, "at">
): Promise<void> => {
  const row: AdminExportHistoryEntry = {
    at: new Date().toISOString(),
    ...entry,
  };
  const ref = adminExportProfileRef(uid);
  const snap = await getDoc(ref);
  const prev: AdminExportHistoryEntry[] =
    snap.exists() && Array.isArray(snap.data()?.history)
      ? (snap.data()!.history as AdminExportHistoryEntry[])
      : [];
  const history = [row, ...prev].slice(0, 30);
  await setDoc(
    ref,
    {
      lastExportAt: row.at,
      history,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};

/**
 * Site maintenance mode functions
 */
const MAINTENANCE_DOC_ID = "site_maintenance";

export interface MaintenanceSettings {
  isEnabled: boolean;
  lastUpdated: number;
  updatedBy?: string;
}

/**
 * Get current maintenance mode status
 */
export const getMaintenanceMode = async (): Promise<boolean> => {
  try {
    const maintenanceRef = doc(db, "settings", MAINTENANCE_DOC_ID);
    const maintenanceDoc = await getDoc(maintenanceRef);

    if (!maintenanceDoc.exists()) {
      return false; // Default to not in maintenance
    }

    const data = maintenanceDoc.data() as MaintenanceSettings;
    return data.isEnabled || false;
  } catch (error) {
    console.error("Error getting maintenance mode:", error);
    return false; // Default to not in maintenance on error
  }
};

/**
 * Subscribe to maintenance mode changes
 */
export const subscribeToMaintenanceMode = (
  callback: (isEnabled: boolean) => void
): Unsubscribe => {
  const maintenanceRef = doc(db, "settings", MAINTENANCE_DOC_ID);
  return onSnapshot(maintenanceRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data() as MaintenanceSettings;
      callback(data.isEnabled || false);
    } else {
      callback(false);
    }
  });
};

/**
 * Set maintenance mode
 */
export const setMaintenanceMode = async (
  isEnabled: boolean,
  updatedBy?: string
): Promise<void> => {
  try {
    const maintenanceRef = doc(db, "settings", MAINTENANCE_DOC_ID);
    await setDoc(
      maintenanceRef,
      {
        isEnabled,
        lastUpdated: Date.now(),
        updatedBy: updatedBy || null,
      } as MaintenanceSettings,
      { merge: true }
    );
  } catch (error) {
    console.error("Error setting maintenance mode:", error);
    throw error;
  }
};
