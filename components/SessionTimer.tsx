"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL_SECONDS = 15;
// Show the widget when this many seconds are left
const SHOW_THRESHOLD = 10;

type SessionTimerProps = {
  timeRemaining: number;
  isTimerPaused: boolean;
  onStay: () => void;
};

export default function SessionTimer({
  timeRemaining,
  isTimerPaused,
  onStay,
}: SessionTimerProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const prevTimeRef = useRef(timeRemaining);
  const prevPausedRef = useRef(isTimerPaused);

  useEffect(() => {
    const prev = prevTimeRef.current;
    const wasPaused = prevPausedRef.current;
    prevTimeRef.current = timeRemaining;
    prevPausedRef.current = isTimerPaused;

    // Always show when paused (so user sees the "verifying" state)
    if (isTimerPaused) {
      setExiting(false);
      setVisible(true);
      return;
    }

    // Show widget when under threshold and counting down
    if (timeRemaining <= SHOW_THRESHOLD && timeRemaining > 0) {
      setExiting(false);
      setVisible(true);
    } else if (
      (prev <= SHOW_THRESHOLD && timeRemaining > SHOW_THRESHOLD) ||
      (wasPaused && !isTimerPaused && timeRemaining > SHOW_THRESHOLD)
    ) {
      // Timer was reset or unpaused back to safe — play exit animation then hide
      setExiting(true);
      const t = setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [timeRemaining, isTimerPaused]);

  if (!visible) return null;

  // SVG ring math — freeze the ring position while paused
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = isTimerPaused ? 1 : timeRemaining / TOTAL_SECONDS;
  const dashOffset = circumference * (1 - progress);

  // Color: blue while paused, green→yellow→red while counting
  const hue = Math.round(progress * 120);
  const ringColor = isTimerPaused
    ? "#60a5fa" // blue-400
    : timeRemaining <= 5
    ? `hsl(${hue}, 100%, 55%)`
    : `hsl(${hue}, 90%, 50%)`;

  const urgent = !isTimerPaused && timeRemaining <= 5;

  return (
    <div
      className={`fixed bottom-6 right-4 z-50 sm:bottom-8 sm:right-6 transition-all duration-300 ${
        exiting
          ? "opacity-0 translate-y-4 scale-95"
          : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      {/* Card */}
      <div
        className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
          isTimerPaused
            ? "border-blue-500/30 bg-[#080e1a]/80"
            : urgent
            ? "border-red-500/40 bg-[#1a0505]/80"
            : "border-yellow-500/30 bg-[#141410]/80"
        } ${urgent ? "animate-[urgentPulse_0.8s_ease-in-out_infinite]" : ""}`}
        style={
          isTimerPaused
            ? { boxShadow: "0 0 20px rgba(96,165,250,0.2), 0 8px 32px rgba(0,0,0,0.6)" }
            : urgent
            ? { boxShadow: "0 0 24px rgba(239,68,68,0.35), 0 8px 32px rgba(0,0,0,0.6)" }
            : { boxShadow: "0 0 16px rgba(234,179,8,0.2), 0 8px 32px rgba(0,0,0,0.6)" }
        }
      >
        {/* SVG ring */}
        <div className="relative flex-shrink-0">
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            className="-rotate-90"
            aria-hidden="true"
          >
            {/* Track */}
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="4"
            />
            {/* Progress arc */}
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: isTimerPaused
                  ? "stroke 0.4s ease"
                  : "stroke-dashoffset 0.5s linear, stroke 0.5s ease",
                filter: `drop-shadow(0 0 6px ${ringColor})`,
              }}
            />
          </svg>

          {/* Centre icon / number */}
          {isTimerPaused ? (
            // Animated spinner dots while paused
            <span className="absolute inset-0 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                className="animate-spin"
                style={{ color: ringColor }}
                fill="none"
                aria-label="Verifying"
              >
                <circle
                  cx="9"
                  cy="9"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="28"
                  strokeDashoffset="18"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          ) : (
            <span
              className="absolute inset-0 flex items-center justify-center font-mono text-base font-bold"
              style={{ color: ringColor }}
            >
              {timeRemaining}
            </span>
          )}
        </div>

        {/* Text area */}
        <div className="flex flex-col gap-1">
          {isTimerPaused ? (
            <>
              <p className="text-xs font-semibold text-blue-300 leading-tight">
                Verifying identity…
              </p>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Timer paused during auth
              </p>
              <div className="mt-1 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-blue-400"
                    style={{
                      animation: `bounceDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-zinc-200 leading-tight">
                {urgent ? "⚠ Locking soon!" : "Auto-locking in"}
              </p>
              <p className="text-[11px] text-zinc-400 leading-tight">
                {urgent
                  ? "Move or tap to stay"
                  : `${timeRemaining}s of inactivity`}
              </p>
              <button
                type="button"
                onClick={onStay}
                className="mt-1 self-start rounded-full px-3 py-1 text-[11px] font-semibold transition-all"
                style={{
                  background: urgent
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(234,179,8,0.15)",
                  color: urgent ? "#f87171" : "#fbbf24",
                  border: `1px solid ${
                    urgent ? "rgba(239,68,68,0.4)" : "rgba(234,179,8,0.35)"
                  }`,
                }}
              >
                Stay logged in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
