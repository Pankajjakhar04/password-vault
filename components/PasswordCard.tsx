"use client";

import { useState } from "react";

type PasswordCardProps = {
  entry: {
    id: string;
    siteName: string;
    username: string;
    password: string;
    updatedAt: string;
  };
  onCopy: (password: string) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
};

export default function PasswordCard({
  entry,
  onCopy,
  onEdit,
  onDelete,
}: PasswordCardProps) {
  const [revealed, setRevealed] = useState(false);
  const updatedLabel = formatTimestamp(entry.updatedAt);

  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--vault-muted)]">
          {entry.siteName}
        </p>
        <p className="text-lg font-semibold">{entry.username}</p>
        <p className="text-xs text-zinc-500">Updated {updatedLabel}</p>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-[color:var(--vault-border)] bg-[#0f0f0f] px-4 py-3">
        <span className="font-mono text-sm text-zinc-200">
          {revealed ? entry.password : "••••••••"}
        </span>
        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          className="flex items-center gap-1 text-xs text-[color:var(--vault-accent)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
          >
            <path
              d="M2 12C4.8 7 8.4 4.5 12 4.5C15.6 4.5 19.2 7 22 12C19.2 17 15.6 19.5 12 19.5C8.4 19.5 4.8 17 2 12Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {revealed ? "Hide" : "Reveal"}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onCopy(entry.password)}
          className="text-xs font-semibold text-zinc-100 hover:text-[color:var(--vault-accent)]"
        >
          Copy Password
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-zinc-400 hover:text-[color:var(--vault-accent)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="text-xs text-zinc-400 hover:text-red-400"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }
  return date.toLocaleString();
};
