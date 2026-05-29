"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FingerprintButton from "@/components/FingerprintButton";
import PinInput from "@/components/PinInput";
import { useAuth } from "@/lib/auth-context";
import {
  deriveKeyFromAnswers,
  deriveKeyFromPin,
  generateMasterKeyBytes,
  generateSaltBase64,
  wrapKeyBytes,
} from "@/lib/crypto";
import {
  securityQuestions,
  type SecurityQuestionId,
} from "@/lib/security-questions";
import { parseApiResponse } from "@/lib/http";
import { setStoredPinSalt } from "@/lib/storage";
import {
  decodeRegistrationOptions,
  publicKeyCredentialToJSON,
} from "@/lib/webauthn-client";

export default function SetupPage() {
  const router = useRouter();
  const { setEmail, setPinSalt } = useAuth();
  const [email, setLocalEmail] = useState("");
  const [pin, setPin] = useState("");
  const [questionOne, setQuestionOne] = useState<SecurityQuestionId>(
    securityQuestions[0]?.id ?? "q1"
  );
  const [questionTwo, setQuestionTwo] = useState<SecurityQuestionId>(
    securityQuestions[1]?.id ?? "q2"
  );
  const [answerOne, setAnswerOne] = useState("");
  const [answerTwo, setAnswerTwo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setMessage(null);

    if (!email || pin.length !== 6) {
      setMessage("Enter your email and a 6-digit PIN to continue.");
      return;
    }

    if (!answerOne.trim() || !answerTwo.trim()) {
      setMessage("Answer both security questions to continue.");
      return;
    }

    if (questionOne === questionTwo) {
      setMessage("Please choose two different security questions.");
      return;
    }

    if (!window.PublicKeyCredential) {
      setMessage("WebAuthn is not supported on this device.");
      return;
    }

    setLoading(true);

    try {
      const pinSalt = await generateSaltBase64();
      const qaSalt = await generateSaltBase64();
      const { key: pinKey, verificationHash } = await deriveKeyFromPin(
        pin,
        pinSalt
      );
      const { key: qaKey } = await deriveKeyFromAnswers(
        answerOne,
        answerTwo,
        qaSalt
      );
      const masterKeyBytes = generateMasterKeyBytes();
      const pinWrapped = await wrapKeyBytes(masterKeyBytes, pinKey);
      const qaWrapped = await wrapKeyBytes(masterKeyBytes, qaKey);

      const startResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "start",
          email,
          pinSalt,
          pinVerificationHash: verificationHash,
          qaSalt,
          questionOne,
          questionTwo,
          vaultKeyEncryptedPin: pinWrapped.ciphertext,
          vaultKeyIvPin: pinWrapped.iv,
          vaultKeyEncryptedQa: qaWrapped.ciphertext,
          vaultKeyIvQa: qaWrapped.iv,
        }),
      });

      const startPayload = await parseApiResponse<{
        options?: unknown;
        error?: string;
      }>(startResponse);

      if (!startPayload.ok || !startPayload.data?.options) {
        setMessage(startPayload.error ?? "Unable to start registration.");
        return;
      }

      const publicKey = decodeRegistrationOptions(startPayload.data.options as any);
      const credential = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential | null;

      if (!credential) {
        setMessage("Registration was cancelled.");
        return;
      }

      const credentialJson = publicKeyCredentialToJSON(credential);

      const finishResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "finish",
          email,
          credential: credentialJson,
        }),
      });

      const finishPayload = await parseApiResponse<{
        success?: boolean;
        error?: string;
      }>(finishResponse);

      if (!finishPayload.ok) {
        setMessage(finishPayload.error ?? "Unable to verify fingerprint.");
        return;
      }

      setStoredPinSalt(email, pinSalt);
      setEmail(email);
      setPinSalt(pinSalt);
      setMessage("Setup complete. You can now unlock the vault.");
      router.push("/unlock");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16">
      <div className="glass-card rounded-3xl px-8 py-10 sm:px-12">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--vault-accent)]">
              First-time setup
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Create your vault
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Choose a 6-digit PIN and register your fingerprint to secure the
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
              className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
            />
          </label>

          <div className="flex flex-col gap-3">
            <span className="text-sm text-zinc-300">Create PIN</span>
            <PinInput value={pin} onChange={setPin} autoFocus />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-zinc-300">
              Security question 1
              <select
                value={questionOne}
                onChange={(event) =>
                  setQuestionOne(event.target.value as SecurityQuestionId)
                }
                className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
              >
                {securityQuestions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-300">
              Answer 1
              <input
                value={answerOne}
                onChange={(event) => setAnswerOne(event.target.value)}
                className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
                placeholder="Enter your answer"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-300">
              Security question 2
              <select
                value={questionTwo}
                onChange={(event) =>
                  setQuestionTwo(event.target.value as SecurityQuestionId)
                }
                className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
              >
                {securityQuestions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-300">
              Answer 2
              <input
                value={answerTwo}
                onChange={(event) => setAnswerTwo(event.target.value)}
                className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
                placeholder="Enter your answer"
              />
            </label>
          </div>

          <FingerprintButton
            label="Register fingerprint"
            onClick={handleRegister}
            loading={loading}
          />

          {message ? (
            <p className="text-sm text-[color:var(--vault-accent)]">{message}</p>
          ) : null}

          <div className="text-sm text-zinc-400">
            Already set up?{" "}
            <Link
              href="/unlock"
              className="text-[color:var(--vault-accent)]"
            >
              Unlock your vault
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
