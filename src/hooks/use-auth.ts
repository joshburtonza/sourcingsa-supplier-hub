import { useEffect, useState } from "react";

const STORAGE_KEY = "supplier_portal_session";

export interface PortalSession {
  email: string;
  verifiedAt: number;
}

export interface AuthState {
  session: PortalSession | null;
  user: { email: string } | null;
  fullName: string | null;
  isApproved: boolean;
  loading: boolean;
}

function readSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalSession;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(email: string) {
  const s: PortalSession = { email, verifiedAt: Date.now() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("portal-auth-change"));
  return s;
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("portal-auth-change"));
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(readSession());
    setLoading(false);
    const onChange = () => setSession(readSession());
    window.addEventListener("portal-auth-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("portal-auth-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return {
    session,
    user: session ? { email: session.email } : null,
    fullName: session?.email ?? null,
    isApproved: !!session,
    loading,
  };
}
