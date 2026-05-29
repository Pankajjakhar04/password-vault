"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FingerprintButton from "@/components/FingerprintButton";
import PinInput from "@/components/PinInput";
import { useAuth } from "@/lib/auth-context";
import { deriveKeyFromPin, unwrapMasterKey } from "@/lib/crypto";
import { parseApiResponse } from "@/lib/http";
import { getStoredPinSalt, setStoredPinSalt } from "@/lib/storage";
import {
  decodeAuthenticationOptions,
  publicKeyCredentialToJSON,
} from "@/lib/webauthn-client";

export default function UnlockPage() {
  const router = useRouter();
  const { setAesKey, setEmail, setPinSalt } = useAuth();
  const [email, setLocalEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [webauthnVerified, setWebauthnVerified] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingPin, setLoadingPin] = useState(false);
  const [loadingWebauthn, setLoadingWebauthn] = useState(false);

  useEffect(() => {
    if (pinVerified && webauthnVerified) {
      router.push("/vault");
    }
  }, [pinVerified, webauthnVerified, router]);

  useEffect(() => {
    setPinVerified(false);
    setWebauthnVerified(false);
  }, [email]);

  const handlePinSubmit = async (value: string) => {
    // Normalize email before every operation to ensure consistent cache keys and API lookups
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage("Enter your email before the PIN.");
      return;
    }

    if (value.length !== 6) {
      setMessage("Enter all 6 digits of your PIN.");
      return;
    }

    setLoadingPin(true);
    setMessage(null);

    try {
      let salt = getStoredPinSalt(normalizedEmail);

      if (!salt) {
        const saltResponse = await fetch("/api/auth/login/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, action: "salt" }),
        });

        const saltPayload = await parseApiResponse<{
          pinSalt?: string;
          error?: string;
        }>(saltResponse);

        if (!saltPayload.ok) {
          setMessage(saltPayload.error ?? "Unable to fetch PIN salt.");
          return;
        }

        if (!saltPayload.data?.pinSalt) {
          setMessage("PIN salt missing. Please run setup again.");
          return;
        }

        salt = String(saltPayload.data.pinSalt);
        setStoredPinSalt(normalizedEmail, salt);
      }

      if (!salt) {
        setMessage("PIN salt missing. Please run setup again.");
        return;
      }

      const { key: pinKey, verificationHash } = await deriveKeyFromPin(
        value,
        salt
      );

      const response = await fetch("/api/auth/login/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, pinVerificationHash: verificationHash }),
      });

      const payload = await parseApiResponse<{
        success?: boolean;
        pinVerified?: boolean;
        webauthnVerified?: boolean;
        vaultKeyEncryptedPin?: string;
        vaultKeyIvPin?: string;
        error?: string;
      }>(response);

      if (!payload.ok) {
        setMessage(payload.error ?? "PIN verification failed.");
        setPin("");
        return;
      }

      if (!payload.data?.vaultKeyEncryptedPin || !payload.data?.vaultKeyIvPin) {
        setMessage("Vault key missing. Please re-run setup.");
        return;
      }

      const masterKey = await unwrapMasterKey(
        payload.data.vaultKeyEncryptedPin,
        payload.data.vaultKeyIvPin,
        pinKey
      );

      setAesKey(masterKey);
      setEmail(normalizedEmail);
      setPinSalt(salt);
      setPinVerified(true);
      setMessage("PIN verified. Confirm fingerprint next.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PIN check failed.");
    } finally {
      setLoadingPin(false);
    }
  };

  const handleWebauthn = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage("Enter your email first.");
      return;
    }

    if (!window.PublicKeyCredential) {
      setMessage("WebAuthn is not supported on this device.");
      return;
    }

    setLoadingWebauthn(true);
    setMessage(null);

    try {
      const challengeResponse = await fetch(
        "/api/auth/login/webauthn/challenge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        }
      );

      const challengePayload = await parseApiResponse<{
        options?: unknown;
        error?: string;
      }>(challengeResponse);

      if (!challengePayload.ok || !challengePayload.data?.options) {
        setMessage(challengePayload.error ?? "Unable to start WebAuthn.");
        return;
      }

      const publicKey = decodeAuthenticationOptions(
        challengePayload.data.options as any
      );
      const credential = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null;

      if (!credential) {
        setMessage("Fingerprint verification cancelled.");
        return;
      }

      const credentialJson = publicKeyCredentialToJSON(credential);

      const verifyResponse = await fetch(
        "/api/auth/login/webauthn/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, credential: credentialJson }),
        }
      );

      const verifyPayload = await parseApiResponse<{
        success?: boolean;
        pinVerified?: boolean;
        webauthnVerified?: boolean;
        error?: string;
      }>(verifyResponse);

      if (!verifyPayload.ok) {
        setMessage(verifyPayload.error ?? "Fingerprint verification failed.");
        return;
      }

      setWebauthnVerified(true);
      setMessage("Fingerprint verified. Unlocking vault.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "WebAuthn failed."
      );
    } finally {
      setLoadingWebauthn(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <div className="glass-card rounded-3xl px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--vault-accent)]">
              Unlock vault
            </p>
            <h1 className="text-2xl font-semibold sm:text-4xl">
              Two-step unlock required
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Confirm your 6-digit PIN and WebAuthn fingerprint to open the
              vault.
            </p>
          </div>

          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Email
            <input
              value={email}
              onChange={(event) => setLocalEmail(event.target.value)}
              type="email"
              placeholder="you@vault.com"
              className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-base text-white"
            />
          </label>

          <div className="flex flex-col gap-3">
            <span className="text-sm text-zinc-300">Enter PIN</span>
            <PinInput
              value={pin}
              onChange={setPin}
              onComplete={handlePinSubmit}
              autoFocus
            />
            <button
              type="button"
              disabled={loadingPin}
              onClick={() => handlePinSubmit(pin)}
              className="w-fit rounded-full border border-[color:var(--vault-border)] px-4 py-2 text-xs text-zinc-200"
            >
              {loadingPin ? "Checking..." : "Verify PIN"}
            </button>
          </div>

          <FingerprintButton
            label="Scan fingerprint"
            onClick={handleWebauthn}
            loading={loadingWebauthn}
            disabled={!pinVerified}
          />

          {message ? (
            <p className="text-sm text-[color:var(--vault-accent)]">{message}</p>
          ) : null}

          <div className="text-sm text-zinc-400">
            Need to set up first?{" "}
            <Link
              href="/setup"
              className="text-[color:var(--vault-accent)]"
            >
              Create your vault
            </Link>
          </div>
          <div className="text-sm text-zinc-400">
            Forgot your PIN?{" "}
            <Link
              href="/reset"
              className="text-[color:var(--vault-accent)]"
            >
              Reset with security questions
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
