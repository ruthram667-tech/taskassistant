// Standard mock client-side Firebase Auth & Firestore implementation powered by Dexie.js (IndexedDB).
// This runs entirely in the browser (client-side) without a backend server, ensuring privacy and speed.

import { localDb, DBTask, DBCallLog, DBSettings } from "../db";

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerData: any[];
  tenantId: string | null;
  isAnonymous: boolean;
}

// Global cached values
let cachedAccessToken: string | null = null;

// Real-time Pub/Sub subscription registry for collections
type SnapshotListener = () => void;
const snapshotListeners: Record<string, Set<SnapshotListener>> = {};

export const subscribeToCollection = (collectionName: string, listener: SnapshotListener) => {
  const normalized = collectionName.toLowerCase();
  if (!snapshotListeners[normalized]) {
    snapshotListeners[normalized] = new Set();
  }
  snapshotListeners[normalized].add(listener);
  return () => {
    snapshotListeners[normalized].delete(listener);
  };
};

export const triggerCollectionUpdate = (collectionName: string) => {
  const normalized = collectionName.toLowerCase();
  if (snapshotListeners[normalized]) {
    snapshotListeners[normalized].forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error(`Error triggering listener for collection ${collectionName}:`, err);
      }
    });
  }
};

// --- FIRESTORE BRIDGE TO DEXIE.JS ---

export const db = {
  _type: "firestore",
};

export const collection = (firestoreInstance: any, collectionName: string) => {
  return {
    _type: "collection",
    path: collectionName,
  };
};

export const doc = (firestoreInstanceOrCollection: any, collectionNameOrId: string, docId?: string) => {
  if (docId) {
    return {
      _type: "doc",
      path: collectionNameOrId,
      id: docId,
    };
  } else {
    const path = typeof firestoreInstanceOrCollection === "string" ? firestoreInstanceOrCollection : firestoreInstanceOrCollection.path;
    return {
      _type: "doc",
      path,
      id: collectionNameOrId,
    };
  }
};

// Map incoming React task structure to Dexie-compliant DBTask
const mapToDBTask = (reactTask: any): DBTask => {
  return {
    id: reactTask.id || `task_${Math.random().toString(36).substring(2, 11)}`,
    title: reactTask.title || "",
    description: reactTask.description || "",
    due_date: reactTask.dueDate || reactTask.due_date || new Date().toISOString().split("T")[0],
    urgency: reactTask.priority || reactTask.urgency || "medium",
    status: reactTask.status || "pending",
    alerts_enabled: reactTask.escalationEnabled !== undefined ? reactTask.escalationEnabled : (reactTask.alerts_enabled !== undefined ? reactTask.alerts_enabled : true),
    // Retain supporting properties for React app
    due_time: reactTask.dueTime || reactTask.due_time,
    scheduled_time: reactTask.scheduledTime || reactTask.scheduled_time || "",
    userId: reactTask.userId,
    createdAt: reactTask.createdAt || new Date().toISOString()
  } as any;
};

// Map DBTask from Dexie back to React task structure
const mapFromDBTask = (dbTask: DBTask): any => {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description,
    dueDate: dbTask.due_date,
    due_date: dbTask.due_date,
    priority: dbTask.urgency,
    urgency: dbTask.urgency,
    status: dbTask.status,
    escalationEnabled: dbTask.alerts_enabled,
    alerts_enabled: dbTask.alerts_enabled,
    // Supporting properties
    dueTime: (dbTask as any).due_time,
    scheduledTime: dbTask.scheduled_time || "",
    userId: dbTask.userId,
    createdAt: dbTask.createdAt,
    estimatedDuration: (dbTask as any).estimatedDuration || 15,
    escalationPhone: (dbTask as any).escalationPhone || "",
    escalationContacts: (dbTask as any).escalationContacts || []
  };
};

// Map incoming call log to DBCallLog
const mapToDBCallLog = (reactLog: any): DBCallLog => {
  return {
    id: reactLog.id || `log_${Math.random().toString(36).substring(2, 11)}`,
    task_id: reactLog.taskId || reactLog.task_id || "unknown_task",
    timestamp: reactLog.timestamp || new Date().toISOString(),
    status: reactLog.status || "completed",
    // Retain additional properties for UI
    userId: reactLog.userId,
    taskTitle: reactLog.taskTitle,
    contactName: reactLog.contactName,
    phoneNumber: reactLog.phoneNumber,
    tier: reactLog.tier,
    script: reactLog.script,
    urgency: reactLog.urgency
  } as any;
};

// Map DBCallLog back to React
const mapFromDBCallLog = (dbLog: DBCallLog): any => {
  return {
    id: dbLog.id,
    taskId: dbLog.task_id,
    task_id: dbLog.task_id,
    timestamp: dbLog.timestamp,
    status: dbLog.status,
    userId: (dbLog as any).userId,
    taskTitle: (dbLog as any).taskTitle,
    contactName: (dbLog as any).contactName,
    phoneNumber: (dbLog as any).phoneNumber,
    tier: (dbLog as any).tier,
    script: (dbLog as any).script,
    urgency: (dbLog as any).urgency
  };
};

export const addDoc = async (collectionRef: any, data: any) => {
  const collectionName = collectionRef.path;
  const id = data.id || `doc_${Math.random().toString(36).substring(2, 11)}`;
  
  if (collectionName === "tasks") {
    const dbTask = mapToDBTask({ ...data, id });
    await localDb.tasks.put(dbTask);
    triggerCollectionUpdate("tasks");
    return { id };
  } else if (collectionName === "callLogs" || collectionName === "call_logs") {
    const dbLog = mapToDBCallLog({ ...data, id });
    await localDb.call_logs.put(dbLog);
    triggerCollectionUpdate("calllogs");
    return { id };
  } else if (collectionName === "messages") {
    // Keep in localStorage or map to a general table if needed.
    // For MessengerPanel, we can put in localStorage for simple fallback or map to IndexedDB
    const key = `taskassist_db_messages`;
    const colData = JSON.parse(localStorage.getItem(key) || "{}");
    colData[id] = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(colData));
    triggerCollectionUpdate("messages");
    return { id };
  }

  return { id };
};

export const getDoc = async (docRef: any) => {
  const collectionName = docRef.path;
  const id = docRef.id;

  if (collectionName === "tasks") {
    const item = await localDb.tasks.get(id);
    return {
      id,
      exists: () => !!item,
      data: () => item ? mapFromDBTask(item) : undefined,
    };
  } else if (collectionName === "users" || collectionName === "settings") {
    // Map settings / user profiles
    const savedUser = localStorage.getItem("taskassist_session_user");
    const userEmail = savedUser ? JSON.parse(savedUser).email : "john132@mail.com";
    const settingsItem = await localDb.settings.get(userEmail);
    if (settingsItem) {
      return {
        id,
        exists: () => true,
        data: () => ({ phone: (settingsItem as any).phone || "", ...settingsItem }),
      };
    }
    // Fallback to localStorage phone setting
    const phone = localStorage.getItem(`taskassist_phone_${id}`) || "";
    return {
      id,
      exists: () => !!phone,
      data: () => ({ phone }),
    };
  }

  return {
    id,
    exists: () => false,
    data: () => undefined,
  };
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }) => {
  const collectionName = docRef.path;
  const id = docRef.id;

  if (collectionName === "tasks") {
    const dbTask = mapToDBTask({ ...data, id });
    await localDb.tasks.put(dbTask);
    triggerCollectionUpdate("tasks");
  } else if (collectionName === "users" || collectionName === "settings") {
    const savedUser = localStorage.getItem("taskassist_session_user");
    const userEmail = savedUser ? JSON.parse(savedUser).email : "john132@mail.com";
    
    const existing = await localDb.settings.get(userEmail);
    const updated = {
      user_email: userEmail,
      theme_preference: "black-and-white" as const,
      phone: data.phone !== undefined ? data.phone : (existing ? (existing as any).phone : ""),
      ...data
    };
    await localDb.settings.put(updated);
    localStorage.setItem(`taskassist_phone_${id}`, updated.phone);
    triggerCollectionUpdate("settings");
  }
};

export const updateDoc = async (docRef: any, data: any) => {
  const collectionName = docRef.path;
  const id = docRef.id;

  if (collectionName === "tasks") {
    const existing = await localDb.tasks.get(id);
    if (existing) {
      const merged = mapFromDBTask(existing);
      const updated = mapToDBTask({ ...merged, ...data });
      await localDb.tasks.put(updated);
      triggerCollectionUpdate("tasks");
    }
  } else if (collectionName === "messages") {
    const key = `taskassist_db_messages`;
    const colData = JSON.parse(localStorage.getItem(key) || "{}");
    if (colData[id]) {
      colData[id] = { ...colData[id], ...data };
      localStorage.setItem(key, JSON.stringify(colData));
      triggerCollectionUpdate("messages");
    }
  }
};

export const deleteDoc = async (docRef: any) => {
  const collectionName = docRef.path;
  const id = docRef.id;

  if (collectionName === "tasks") {
    await localDb.tasks.delete(id);
    triggerCollectionUpdate("tasks");
  } else if (collectionName === "messages") {
    const key = `taskassist_db_messages`;
    const colData = JSON.parse(localStorage.getItem(key) || "{}");
    if (colData[id]) {
      delete colData[id];
      localStorage.setItem(key, JSON.stringify(colData));
      triggerCollectionUpdate("messages");
    }
  }
};

export const query = (collectionRef: any, ...constraints: any[]) => {
  return {
    _type: "query",
    collectionRef,
    constraints,
  };
};

export const where = (field: string, operator: string, value: any) => {
  return {
    _type: "constraint",
    kind: "where",
    field,
    operator,
    value,
  };
};

export const orderBy = (field: string, direction: "asc" | "desc" = "asc") => {
  return {
    _type: "constraint",
    kind: "orderBy",
    field,
    direction,
  };
};

export const getDocs = async (queryOrColRef: any) => {
  const isQuery = queryOrColRef._type === "query";
  const collectionName = isQuery ? queryOrColRef.collectionRef.path : queryOrColRef.path;
  
  if (collectionName === "tasks") {
    const items = await localDb.tasks.toArray();
    const mapped = items.map(item => {
      const reactTask = mapFromDBTask(item);
      return {
        id: item.id,
        exists: () => true,
        data: () => reactTask,
      };
    });
    return {
      docs: mapped,
      forEach(callback: (doc: any) => void) {
        mapped.forEach(callback);
      },
    };
  } else if (collectionName === "callLogs" || collectionName === "call_logs") {
    const items = await localDb.call_logs.toArray();
    const mapped = items.map(item => {
      const reactLog = mapFromDBCallLog(item);
      return {
        id: item.id,
        exists: () => true,
        data: () => reactLog,
      };
    });
    return {
      docs: mapped,
      forEach(callback: (doc: any) => void) {
        mapped.forEach(callback);
      },
    };
  } else if (collectionName === "messages") {
    const key = `taskassist_db_messages`;
    const colData = JSON.parse(localStorage.getItem(key) || "{}");
    const mapped = Object.keys(colData).map(id => {
      return {
        id,
        exists: () => true,
        data: () => ({ ...colData[id] }),
      };
    });
    return {
      docs: mapped,
      forEach(callback: (doc: any) => void) {
        mapped.forEach(callback);
      },
    };
  }

  return {
    docs: [],
    forEach() {},
  };
};

export const onSnapshot = (queryOrRef: any, onNext: (snap: any) => void, onError?: (err: any) => void) => {
  const isQuery = queryOrRef._type === "query";
  const isDoc = queryOrRef._type === "doc";
  const collectionName = isDoc ? queryOrRef.path : (isQuery ? queryOrRef.collectionRef.path : queryOrRef.path);
  
  const triggerUpdate = async () => {
    try {
      if (isDoc) {
        const snap = await getDoc(queryOrRef);
        onNext(snap);
      } else {
        const snap = await getDocs(queryOrRef);
        onNext(snap);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };
  
  triggerUpdate();
  
  return subscribeToCollection(collectionName, triggerUpdate);
};

// --- AUTH COEXISTENCE ---

export const auth = {
  _type: "auth",
  get currentUser(): User | null {
    const userStr = localStorage.getItem("taskassist_session_user");
    if (!userStr) return null;
    const p = JSON.parse(userStr);
    return {
      uid: p.uid,
      email: p.email,
      displayName: p.displayName,
      photoURL: p.photoURL || null,
      emailVerified: true,
      providerData: [],
      tenantId: null,
      isAnonymous: false,
    };
  },
};

export const onAuthStateChanged = (authInstance: any, callback: (user: User | null) => void) => {
  const check = () => callback(auth.currentUser);
  check();
  return subscribeToCollection("auth", check);
};

export const signInWithPopup = async (authInstance: any, provider: any) => {
  const mockUser = {
    uid: "google_operator_user",
    email: "john132@mail.com",
    displayName: "John",
    photoURL: null,
  };
  localStorage.setItem("taskassist_session_user", JSON.stringify(mockUser));
  localStorage.setItem("taskassist_session_token", "mock-gis-credential-token");
  triggerCollectionUpdate("auth");
  return { user: { ...mockUser, emailVerified: true, providerData: [], tenantId: null, isAnonymous: false } };
};

export const googleSignIn = async () => {
  return signInWithPopup(auth, null);
};

export const logoutUser = async () => {
  localStorage.removeItem("taskassist_session_user");
  localStorage.removeItem("taskassist_session_token");
  triggerCollectionUpdate("auth");
};

export const initAuth = (
  onAuthSuccess?: (user: any, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, localStorage.getItem("taskassist_session_token"));
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return localStorage.getItem("taskassist_session_token") || "mock-gis-credential-token";
};

export const setAccessToken = (token: string) => {
  localStorage.setItem("taskassist_session_token", token);
};

