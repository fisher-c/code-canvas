import type { Language } from "@/components/LanguageSelector";

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL;

// Detect if we're in production (not running on Vite dev server)
const isProduction = typeof window !== 'undefined' && !['5173', '5174', '5175'].includes(window.location.port);

const API_BASE_URL = (RAW_API_BASE && RAW_API_BASE.trim() !== '')
  ? RAW_API_BASE
  : (isProduction ? window.location.origin : "http://localhost:4000");

export class ApiError extends Error {
  status?: number;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      // ignore
    }
    const error = new ApiError(detail);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return undefined as unknown as T;
  return (await response.json()) as T;
}

export interface CodeDocument {
  language: Language;
  content: string;
  version: number;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface Participant {
  participantId: string;
  displayName?: string | null;
  joinedAt: string;
  lastSeenAt: string;
}

export interface Session {
  sessionId: string;
  title?: string | null;
  createdAt: string;
  lastActiveAt: string;
  activeParticipants: number;
  codeByLanguage: Record<Language, CodeDocument>;
  participants: Participant[];
}

export interface CodeSnapshot {
  sessionId: string;
  codeByLanguage: Record<Language, CodeDocument>;
}

export interface SessionPresence {
  sessionId: string;
  participantId?: string | null;
  activeParticipants: number;
  participants: Participant[];
}

export async function createSession(sessionId?: string): Promise<Session> {
  return apiFetch<Session>("/sessions", {
    method: "POST",
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });
}

export async function getSession(sessionId: string): Promise<Session> {
  return apiFetch<Session>(`/sessions/${sessionId}`);
}

export async function getCodeSnapshot(
  sessionId: string,
  language?: Language
): Promise<CodeSnapshot> {
  const params = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<CodeSnapshot>(`/sessions/${sessionId}/code${params}`);
}

export async function saveCode(
  sessionId: string,
  payload: { language: Language; content: string; author?: string }
): Promise<CodeDocument> {
  return apiFetch<CodeDocument>(`/sessions/${sessionId}/code`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function joinSession(
  sessionId: string,
  payload: { displayName?: string } = {}
): Promise<SessionPresence> {
  return apiFetch<SessionPresence>(`/sessions/${sessionId}/participants`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function leaveSession(
  sessionId: string,
  participantId: string,
  options: { keepalive?: boolean } = {}
): Promise<void> {
  await apiFetch<void>(`/sessions/${sessionId}/participants/${participantId}`, {
    method: "DELETE",
    keepalive: options.keepalive ?? false,
  });
}

export { API_BASE_URL };
