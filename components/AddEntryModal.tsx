"use client";

import { useEffect, useState } from "react";

export type EntryFormData = {
  siteName: string;
  username: string;
  password: string;
};

type AddEntryModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (entry: EntryFormData) => void;
  initialData?: EntryFormData | null;
  title?: string;
  submitLabel?: string;
};

export default function AddEntryModal({
  open,
  onClose,
  onSave,
  initialData,
  title,
  submitLabel,
}: AddEntryModalProps) {
  const [siteName, setSiteName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setSiteName(initialData?.siteName ?? "");
      setUsername(initialData?.username ?? "");
      setPassword(initialData?.password ?? "");
      return;
    }

    setSiteName("");
    setUsername("");
    setPassword("");
  }, [open, initialData]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="glass-card w-full max-w-lg rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            {title ?? "Add new entry"}
          </h2>
          <p className="text-sm text-zinc-400">
            Passwords are encrypted on your device before saving.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Site name
            <input
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
              placeholder="example.com"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
              placeholder="name@example.com"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
              placeholder="********"
              type="password"
            />
          </label>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-[color:var(--vault-border)] px-5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                siteName: siteName.trim(),
                username: username.trim(),
                password,
              })
            }
            className="h-11 rounded-full bg-[color:var(--vault-accent)] px-6 text-sm font-semibold text-black"
          >
            {submitLabel ?? "Save entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
