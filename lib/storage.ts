"use client";

const keyFor = (email: string) => `vault_pin_salt:${email.toLowerCase()}`;

export function getStoredPinSalt(email: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(keyFor(email));
}

export function setStoredPinSalt(email: string, salt: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(keyFor(email), salt);
}

export function clearStoredPinSalt(email: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(keyFor(email));
}
