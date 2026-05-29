"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FingerprintButton from "@/components/FingerprintButton";
import PinInput from "@/components/PinInput";
import {
  deriveKeyFromAnswers,
  deriveKeyFromPin,
  generateSaltBase64,
  unwrapKeyBytes,
  wrapKeyBytes,
} from "@/lib/crypto";
import { parseApiResponse } from "@/lib/http";
import { securityQuestions } from "@/lib/security-questions";
import {
  decodeAuthenticationOptions,
  publicKeyCredentialToJSON,
} from "@/lib/webauthn-client";

type ResetMeta = {
  questionOne: string;
  questionTwo: string;
  qaSalt: string;
  vaultKeyEncryptedQa: string;
  vaultKeyIvQa: string;
};

export default function ResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [meta, setMeta] = useState<ResetMeta | null>(null);
  const [answerOne, setAnswerOne] = useState("");
  const [answerTwo, setAnswerTwo] = useState("");
  const [pin, setPin] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const questionLabel = (id: string) =>
    securityQuestions.find((q) => q.id === id)?.label ?? "Unknown question";

  const loadQuestions = async () => {
    setMessage(null);

    if (!email) {
      setMessage("Enter your email to continue.");
      return;
    }

    setLoadingMeta(true);

    try {
      const response = await fetch("/api/auth/reset/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await parseApiResponse<ResetMeta & { error?: string }>(
        response
      );

      if (!payload.ok || !payload.data) {
        setMessage(payload.error ?? "Unable to load security questions.");
        return;
      }

      setMeta(payload.data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load questions."
      );
    } finally {
      setLoadingMeta(false);
    }
  };

  const verifyFingerprint = async () => {
    if (!window.PublicKeyCredential) {
      setMessage("WebAuthn is not supported on this device.");
      return false;
    }

    const challengeResponse = await fetch(
      "/api/auth/login/webauthn/challenge",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    const challengePayload = await parseApiResponse<{
      options?: unknown;
      error?: string;
    }>(challengeResponse);

    if (!challengePayload.ok || !challengePayload.data?.options) {
      setMessage(challengePayload.error ?? "Unable to start fingerprint check.");
      return false;
    }

    const publicKey = decodeAuthenticationOptions(
      challengePayload.data.options as any
    );
    const credential = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential | null;

    if (!credential) {
      setMessage("Fingerprint verification was cancelled.");
      return false;
    }

    const credentialJson = publicKeyCredentialToJSON(credential);

    const verifyResponse = await fetch("/api/auth/login/webauthn/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, credential: credentialJson }),
    });

    const verifyPayload = await parseApiResponse<{
      success?: boolean;
      error?: string;
    }>(verifyResponse);

    if (!verifyPayload.ok) {
      setMessage(verifyPayload.error ?? "Fingerprint verification failed.");
      return false;
    }

    return true;
  };

  const handleReset = async () => {
    setMessage(null);

    if (!meta) {
      setMessage("Load your security questions first.");
      return;
    }

    if (!answerOne.trim() || !answerTwo.trim()) {
      setMessage("Answer both security questions to continue.");
      return;
    }

    if (pin.length !== 6) {
      setMessage("Enter your new 6-digit PIN.");
      return;
    }

    setLoadingReset(true);

    try {
      const verified = await verifyFingerprint();
      if (!verified) {
        return;
      }

      const { key: qaKey } = await deriveKeyFromAnswers(
        answerOne,
        answerTwo,
        meta.qaSalt
      );
      const masterKeyBytes = await unwrapKeyBytes(
        meta.vaultKeyEncryptedQa,
        meta.vaultKeyIvQa,
        qaKey
      );

      const pinSalt = await generateSaltBase64();
      const { key: pinKey, verificationHash } = await deriveKeyFromPin(
        pin,
        pinSalt
      );
      const pinWrapped = await wrapKeyBytes(masterKeyBytes, pinKey);

      const response = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          pinSalt,
          pinVerificationHash: verificationHash,
          vaultKeyEncryptedPin: pinWrapped.ciphertext,
          vaultKeyIvPin: pinWrapped.iv,
        }),
      });

      const payload = await parseApiResponse<{ success?: boolean }>(response);

      if (!payload.ok) {
        setMessage(payload.error ?? "Unable to reset PIN.");
        return;
      }

      setMessage("PIN reset successfully. You can unlock the vault now.");
      router.push("/unlock");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to reset PIN."
      );
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <div className="glass-card rounded-3xl px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--vault-accent)]">
              Reset PIN
            </p>
            <h1 className="text-2xl font-semibold sm:text-4xl">
              Verify your identity
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Answer both security questions and confirm your fingerprint to set
              a new PIN.
            </p>
          </div>

          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Email
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@vault.com"
                className="flex-1 rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-base text-white"
              />
              <button
                type="button"
                onClick={loadQuestions}
                className="flex h-12 items-center justify-center rounded-full border border-[color:var(--vault-border)] px-5 text-sm"
              >
                {loadingMeta ? "Loading..." : "Load questions"}
              </button>
            </div>
          </label>

          {meta ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {questionLabel(meta.questionOne)}
                <input
                  value={answerOne}
                  onChange={(event) => setAnswerOne(event.target.value)}
                  className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-base text-white"
                  placeholder="Answer 1"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                {questionLabel(meta.questionTwo)}
                <input
                  value={answerTwo}
                  onChange={(event) => setAnswerTwo(event.target.value)}
                  className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-base text-white"
                  placeholder="Answer 2"
                />
              </label>
              <div className="flex flex-col gap-3">
                <span className="text-sm text-zinc-300">New PIN</span>
                <PinInput value={pin} onChange={setPin} />
              </div>
            </div>
          ) : null}

          <FingerprintButton
            label="Verify fingerprint and reset"
            onClick={handleReset}
            loading={loadingReset}
            disabled={!meta}
          />

          {message ? (
            <p className="text-sm text-[color:var(--vault-accent)]">{message}</p>
          ) : null}

          <div className="text-sm text-zinc-400">
            Remembered your PIN?{" "}
            <Link
              href="/unlock"
              className="text-[color:var(--vault-accent)]"
            >
              Back to unlock
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
