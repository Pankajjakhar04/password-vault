"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AuthContextValue = {
  email: string | null;
  pinSalt: string | null;
  aesKey: CryptoKey | null;
  setEmail: (email: string | null) => void;
  setPinSalt: (salt: string | null) => void;
  setAesKey: (key: CryptoKey | null) => void;
  clearSession: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [pinSalt, setPinSalt] = useState<string | null>(null);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);

  const clearSession = useCallback(() => {
    setEmail(null);
    setPinSalt(null);
    setAesKey(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/unlock");
  }, [clearSession, router]);

  useEffect(() => {
    if (!aesKey) {
      return undefined;
    }

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = window.setTimeout(() => {
        logout();
      }, 15000);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
      "focus",
    ];

    resetTimer();
    events.forEach((eventName) =>
      window.addEventListener(eventName, resetTimer, { passive: true })
    );

    return () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      events.forEach((eventName) =>
        window.removeEventListener(eventName, resetTimer)
      );
    };
  }, [aesKey, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      email,
      pinSalt,
      aesKey,
      setEmail,
      setPinSalt,
      setAesKey,
      clearSession,
      logout,
    }),
    [email, pinSalt, aesKey, clearSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
