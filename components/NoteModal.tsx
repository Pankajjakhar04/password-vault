"use client";

import { useEffect, useState } from "react";

export type NoteFormData = {
  title: string;
  body: string;
};

type NoteModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (note: NoteFormData) => void;
  initialData?: NoteFormData | null;
  title?: string;
  submitLabel?: string;
};

export default function NoteModal({
  open,
  onClose,
  onSave,
  initialData,
  title,
  submitLabel,
}: NoteModalProps) {
  const [noteTitle, setNoteTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setNoteTitle(initialData?.title ?? "");
      setBody(initialData?.body ?? "");
      return;
    }

    setNoteTitle("");
    setBody("");
  }, [open, initialData]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="glass-card w-full max-w-lg rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{title ?? "Add note"}</h2>
          <p className="text-sm text-zinc-400">
            Notes are encrypted on your device before saving.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Title (optional)
            <input
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
              placeholder="Server creds, recovery, etc."
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Note
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-[140px] rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
              placeholder="Paste your secret text here"
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
                title: noteTitle.trim(),
                body: body.trim(),
              })
            }
            className="h-11 rounded-full bg-[color:var(--vault-accent)] px-6 text-sm font-semibold text-black"
          >
            {submitLabel ?? "Save note"}
          </button>
        </div>
      </div>
    </div>
  );
}
