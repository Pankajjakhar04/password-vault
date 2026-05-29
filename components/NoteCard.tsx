"use client";

import { useState } from "react";

type NoteCardProps = {
  note: {
    id: string;
    title: string;
    body: string;
    updatedAt: string;
  };
  onCopy: (body: string) => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
};

export default function NoteCard({
  note,
  onCopy,
  onEdit,
  onDelete,
}: NoteCardProps) {
  const [revealed, setRevealed] = useState(false);
  const updatedLabel = formatTimestamp(note.updatedAt);

  return (
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--vault-muted)]">
          {note.title || "Secure note"}
        </p>
        <p className="text-sm text-zinc-300">Encrypted note</p>
        <p className="text-xs text-zinc-500">Updated {updatedLabel}</p>
      </div>
      <div className="rounded-xl border border-[color:var(--vault-border)] bg-[#0f0f0f] px-4 py-3">
        <p className="text-xs text-zinc-400">Content</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">
          {revealed ? note.body : "••••••••••••"}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setRevealed((prev) => !prev)}
          className="text-xs text-[color:var(--vault-accent)]"
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onCopy(note.body)}
            className="text-xs text-zinc-400 hover:text-[color:var(--vault-accent)]"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-zinc-400 hover:text-[color:var(--vault-accent)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
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
