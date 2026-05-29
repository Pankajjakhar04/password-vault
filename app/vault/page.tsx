"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AddEntryModal, { EntryFormData } from "@/components/AddEntryModal";
import NoteModal, { NoteFormData } from "@/components/NoteModal";
import NoteCard from "@/components/NoteCard";
import PasswordCard from "@/components/PasswordCard";
import { useAuth } from "@/lib/auth-context";
import { decryptText, encryptText } from "@/lib/crypto";
import { parseApiResponse } from "@/lib/http";
import {
  decodeAuthenticationOptions,
  publicKeyCredentialToJSON,
} from "@/lib/webauthn-client";

type VaultApiEntry = {
  id: string;
  site_name: string;
  username: string;
  encrypted_password: string;
  iv: string;
  updated_at: string;
};

type VaultEntry = {
  id: string;
  siteName: string;
  username: string;
  password: string;
  updatedAt: string;
};

type VaultApiNote = {
  id: string;
  title: string | null;
  encrypted_body: string;
  iv: string;
  updated_at: string;
};

type VaultNote = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

export default function VaultPage() {
  const { aesKey, logout, email } = useAuth();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<VaultNote | null>(null);

  const verifyFingerprint = useCallback(async () => {
    if (!email) {
      setError("Unlock again to confirm your identity.");
      return false;
    }

    if (!window.PublicKeyCredential) {
      setError("WebAuthn is not supported on this device.");
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
      setError(challengePayload.error ?? "Unable to start fingerprint check.");
      return false;
    }

    const publicKey = decodeAuthenticationOptions(
      challengePayload.data.options as any
    );
    const credential = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential | null;

    if (!credential) {
      setError("Fingerprint verification was cancelled.");
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
      setError(verifyPayload.error ?? "Fingerprint verification failed.");
      return false;
    }

    return true;
  }, [email]);

  const fetchEntries = useCallback(async () => {
    if (!aesKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/passwords", { method: "GET" });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to load entries.");
        return;
      }

      const decrypted = await Promise.all(
        (payload.entries as VaultApiEntry[]).map(async (entry) => ({
          id: entry.id,
          siteName: entry.site_name,
          username: entry.username,
          password: await decryptText(
            entry.encrypted_password,
            entry.iv,
            aesKey
          ),
          updatedAt: entry.updated_at,
        }))
      );

      setEntries(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load entries.");
    } finally {
      setLoading(false);
    }
  }, [aesKey]);

  const fetchNotes = useCallback(async () => {
    if (!aesKey) {
      return;
    }

    setNotesLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notes", { method: "GET" });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to load notes.");
        return;
      }

      const decrypted = await Promise.all(
        (payload.notes as VaultApiNote[]).map(async (note) => ({
          id: note.id,
          title: note.title ?? "",
          body: await decryptText(note.encrypted_body, note.iv, aesKey),
          updatedAt: note.updated_at,
        }))
      );

      setNotes(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notes.");
    } finally {
      setNotesLoading(false);
    }
  }, [aesKey]);

  useEffect(() => {
    if (aesKey) {
      fetchEntries();
      fetchNotes();
    }
  }, [aesKey, fetchEntries, fetchNotes]);

  const handleAddEntry = async (data: EntryFormData) => {
    if (!aesKey) {
      return;
    }

    if (!data.siteName || !data.username || !data.password) {
      setError("Fill out all entry fields before saving.");
      return;
    }

    const verified = await verifyFingerprint();
    if (!verified) {
      return;
    }

    try {
      const encrypted = await encryptText(data.password, aesKey);
      const response = await fetch("/api/passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: data.siteName,
          username: data.username,
          encryptedPassword: encrypted.ciphertext,
          iv: encrypted.iv,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Unable to save entry.");
        return;
      }

      setModalOpen(false);
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save entry.");
    }
  };

  const handleUpdateEntry = async (data: EntryFormData) => {
    if (!aesKey || !editingEntry) {
      return;
    }

    if (!data.siteName || !data.username || !data.password) {
      setError("Fill out all entry fields before saving.");
      return;
    }

    const verified = await verifyFingerprint();
    if (!verified) {
      return;
    }

    try {
      const encrypted = await encryptText(data.password, aesKey);
      const response = await fetch(`/api/passwords/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: data.siteName,
          username: data.username,
          encryptedPassword: encrypted.ciphertext,
          iv: encrypted.iv,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Unable to update entry.");
        return;
      }

      setModalOpen(false);
      setEditingEntry(null);
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update entry.");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/passwords/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Unable to delete entry.");
        return;
      }

      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete entry.");
    }
  };

  const handleAddNote = async (note: NoteFormData) => {
    if (!aesKey) {
      return;
    }

    if (!note.body) {
      setError("Add note content before saving.");
      return;
    }

    const verified = await verifyFingerprint();
    if (!verified) {
      return;
    }

    try {
      const encrypted = await encryptText(note.body, aesKey);
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: note.title,
          encryptedBody: encrypted.ciphertext,
          iv: encrypted.iv,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Unable to save note.");
        return;
      }

      setNoteModalOpen(false);
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save note.");
    }
  };

  const handleUpdateNote = async (note: NoteFormData) => {
    if (!aesKey || !editingNote) {
      return;
    }

    if (!note.body) {
      setError("Add note content before saving.");
      return;
    }

    const verified = await verifyFingerprint();
    if (!verified) {
      return;
    }

    try {
      const encrypted = await encryptText(note.body, aesKey);
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: note.title,
          encryptedBody: encrypted.ciphertext,
          iv: encrypted.iv,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Unable to update note.");
        return;
      }

      setNoteModalOpen(false);
      setEditingNote(null);
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update note.");
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Unable to delete note.");
        return;
      }

      setNotes((prev) => prev.filter((noteItem) => noteItem.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete note.");
    }
  };

  const filteredEntries = useMemo(() => {
    if (!search.trim()) {
      return entries;
    }
    const query = search.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.siteName.toLowerCase().includes(query) ||
        entry.username.toLowerCase().includes(query)
    );
  }, [entries, search]);

  const filteredNotes = useMemo(() => {
    if (!search.trim()) {
      return notes;
    }
    const query = search.toLowerCase();
    return notes.filter(
      (noteItem) =>
        noteItem.title.toLowerCase().includes(query) ||
        noteItem.body.toLowerCase().includes(query)
    );
  }, [notes, search]);

  if (!aesKey) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="glass-card rounded-3xl px-10 py-12 text-center">
          <h1 className="text-2xl font-semibold">Vault locked</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Unlock the vault with your PIN and fingerprint to continue.
          </p>
          <Link
            href="/unlock"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--vault-accent)] px-6 text-sm font-semibold text-black"
          >
            Go to unlock
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--vault-accent)]">
            Vault
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Your entries</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="h-11 rounded-full bg-[color:var(--vault-accent)] px-6 text-sm font-semibold text-black"
          >
            Add entry
          </button>
          <button
            type="button"
            onClick={fetchEntries}
            className="h-11 rounded-full border border-[color:var(--vault-border)] px-5 text-sm"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setNoteModalOpen(true)}
            className="h-11 rounded-full border border-[color:var(--vault-border)] px-5 text-sm"
          >
            Add note
          </button>
          <button
            type="button"
            onClick={logout}
            className="h-11 rounded-full border border-[color:var(--vault-border)] px-5 text-sm text-zinc-300"
          >
            Lock vault
          </button>
        </div>
      </div>

      <div className="glass-card flex flex-col gap-3 rounded-2xl px-5 py-4">
        <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--vault-muted)]">
          Search vault
        </label>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by site, username, or note"
          className="rounded-xl border border-[color:var(--vault-border)] bg-[#0b0b0b] px-4 py-3 text-sm text-white"
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEntries.map((entry) => (
          <PasswordCard
            key={entry.id}
            entry={entry}
            onCopy={(password) => navigator.clipboard.writeText(password)}
            onEdit={() => {
              setEditingEntry(entry);
              setModalOpen(true);
            }}
            onDelete={handleDeleteEntry}
          />
        ))}
      </div>

      {!loading && filteredEntries.length === 0 ? (
        <div className="glass-card rounded-2xl px-6 py-10 text-center text-sm text-zinc-400">
          No entries yet. Add your first password to get started.
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--vault-accent)]">
            Notes
          </p>
          <h2 className="text-2xl font-semibold">Secure notes</h2>
          <p className="text-sm text-zinc-400">
            Save secret text separately from password entries.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((noteItem) => (
            <NoteCard
              key={noteItem.id}
              note={noteItem}
              onCopy={(body) => navigator.clipboard.writeText(body)}
              onEdit={() => {
                setEditingNote(noteItem);
                setNoteModalOpen(true);
              }}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>
        {!notesLoading && filteredNotes.length === 0 ? (
          <div className="glass-card rounded-2xl px-6 py-10 text-center text-sm text-zinc-400">
            No notes yet. Add a secure note to get started.
          </div>
        ) : null}
      </div>

      <AddEntryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={editingEntry ? handleUpdateEntry : handleAddEntry}
        initialData={
          editingEntry
            ? {
                siteName: editingEntry.siteName,
                username: editingEntry.username,
                password: editingEntry.password,
              }
            : null
        }
        title={editingEntry ? "Edit entry" : "Add new entry"}
        submitLabel={editingEntry ? "Save changes" : "Save entry"}
      />

      <NoteModal
        open={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          setEditingNote(null);
        }}
        onSave={editingNote ? handleUpdateNote : handleAddNote}
        initialData={
          editingNote
            ? { title: editingNote.title, body: editingNote.body }
            : null
        }
        title={editingNote ? "Edit note" : "Add note"}
        submitLabel={editingNote ? "Save changes" : "Save note"}
      />
    </main>
  );
}
