"use client";

import { useEffect, useRef } from "react";

type PinInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
};

export default function PinInput({
  value,
  onChange,
  length = 6,
  onComplete,
  autoFocus,
}: PinInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleValueChange = (nextValue: string) => {
    const cleaned = nextValue.replace(/\D/g, "").slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length) {
      onComplete?.(cleaned);
    }
  };

  return (
    <div
      className="flex flex-col gap-3 font-mono"
      onClick={() => inputRef.current?.focus()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onComplete?.(value);
        }
      }}
      role="presentation"
    >
      <div className="flex gap-3">
        {Array.from({ length }).map((_, index) => (
          <div
            key={`pin-dot-${index}`}
            className={`pin-dot ${index < value.length ? "pin-dot-filled" : ""}`}
          />
        ))}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => handleValueChange(event.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        className="sr-only"
        aria-label="Enter 6 digit PIN"
      />
    </div>
  );
}
