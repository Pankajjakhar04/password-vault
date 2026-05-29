import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 py-10 text-zinc-100 sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[rgba(0,255,136,0.08)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[rgba(0,200,255,0.08)] blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-5xl">
        <div className="glass-card rounded-3xl px-5 py-8 sm:px-12 sm:py-12">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--vault-accent)]">
                Zero-knowledge vault
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Neon Vault keeps your passwords sealed with PIN and fingerprint
              </h1>
              <p className="max-w-2xl text-base text-zinc-300 sm:text-lg">
                Everything stays encrypted on your device. Unlock with a 6-digit PIN
                and a WebAuthn biometric prompt before any entry is revealed.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/unlock"
                className="flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--vault-accent)] px-6 text-sm font-semibold text-black transition hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] sm:w-auto"
              >
                Unlock Vault
              </Link>
              <Link
                href="/setup"
                className="flex h-12 w-full items-center justify-center rounded-full border border-[color:var(--vault-border)] px-6 text-sm font-semibold text-zinc-100 transition hover:border-[color:var(--vault-accent)] sm:w-auto"
              >
                First-time setup
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                "AES-256-GCM encryption on every entry",
                "WebAuthn biometric unlock on device",
                "Supabase + Vercel ready in minutes",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[color:var(--vault-border)] bg-[#101010] px-4 py-5 text-sm text-zinc-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
