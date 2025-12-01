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
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { ChatMessage, SupportedLanguage } from "../types";

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
}

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
    await setDoc(
      sessionRef,
      {
        ...session,
        lastUpdated: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error saving chat session:", error);
  }
};

export const createNewSession = async (
  userId: string,
  language: SupportedLanguage,
  userEmail?: string | null,
  isAnonymous: boolean = true
): Promise<string> => {
  try {
    const sessionsRef = collection(db, "chats");
    const newSession: Partial<ChatSession> = {
      userId,
      userEmail: userEmail || null,
      title: `Chat in ${language}`,
      language,
      startTime: Date.now(),
      lastUpdated: Date.now(),
      messages: [],
      isAnonymous,
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
