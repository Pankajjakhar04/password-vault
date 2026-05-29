"use client";

type FingerprintButtonProps = {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export default function FingerprintButton({
  label,
  onClick,
  loading,
  disabled,
}: FingerprintButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{ touchAction: "manipulation" }}
      className={`group relative flex w-full h-12 items-center justify-center gap-3 rounded-full border border-[color:var(--vault-border)] px-5 text-sm font-semibold text-zinc-100 transition hover:border-[color:var(--vault-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit ${
        loading ? "fingerprint-pulse" : ""
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f0f0f]">
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-[color:var(--vault-accent)]"
        >
          <path
            d="M32 12C22.6112 12 15 19.6112 15 29V38"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M49 38V29C49 19.6112 41.3888 12 32 12"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M23 40V29C23 23.4772 27.4772 19 33 19"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M41 41V30C41 26.134 37.866 23 34 23"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M30 44V35"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M35 46V40"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>{loading ? "Waiting for scan..." : label}</span>
    </button>
  );
}
