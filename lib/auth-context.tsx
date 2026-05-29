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
  timeRemaining: number; // seconds until auto-logout
  isTimerPaused: boolean;
  setEmail: (email: string | null) => void;
  setPinSalt: (salt: string | null) => void;
  setAesKey: (key: CryptoKey | null) => void;
  clearSession: () => void;
  logout: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

const INACTIVITY_SECONDS = 15;

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [pinSalt, setPinSalt] = useState<string | null>(null);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(INACTIVITY_SECONDS);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const inactivityTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const deadlineRef = useRef<number>(Date.now() + INACTIVITY_SECONDS * 1000);
  // Keep a stable ref to the resetTimer function so pauseTimer/resumeTimer can call it
  const resetTimerRef = useRef<(() => void) | null>(null);

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

  /** Freeze the auto-logout timer — call before any async auth operation */
  const pauseTimer = useCallback(() => {
    setIsTimerPaused(true);
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
  }, []);

  /** Unfreeze the timer and reset to full 15 s — call after auth completes */
  const resumeTimer = useCallback(() => {
    setIsTimerPaused(false);
    // Trigger a reset by calling the stored resetTimer function
    resetTimerRef.current?.();
  }, []);

  useEffect(() => {
    if (!aesKey) {
      // Clear any running timers when locked
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      setTimeRemaining(INACTIVITY_SECONDS);
      setIsTimerPaused(false);
      return undefined;
    }

    const resetTimer = () => {
      // Reset deadline
      deadlineRef.current = Date.now() + INACTIVITY_SECONDS * 1000;
      setTimeRemaining(INACTIVITY_SECONDS);

      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = window.setTimeout(() => {
        logout();
      }, INACTIVITY_SECONDS * 1000);
    };

    // Expose resetTimer so pauseTimer/resumeTimer can call it
    resetTimerRef.current = resetTimer;

    // Tick the countdown every 500ms
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = window.setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.round((deadlineRef.current - Date.now()) / 1000)
      );
      setTimeRemaining(secondsLeft);
    }, 500);

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
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
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
      timeRemaining,
      isTimerPaused,
      setEmail,
      setPinSalt,
      setAesKey,
      clearSession,
      logout,
      pauseTimer,
      resumeTimer,
    }),
    [email, pinSalt, aesKey, timeRemaining, isTimerPaused, clearSession, logout, pauseTimer, resumeTimer]
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
