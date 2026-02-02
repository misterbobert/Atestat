import React from "react"

export default function StatusPill({ tone = "idle", text }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/20"
      : tone === "warn"
      ? "bg-amber-500/15 text-amber-200 border-amber-400/20"
      : tone === "bad"
      ? "bg-rose-500/15 text-rose-200 border-rose-400/20"
      : "bg-white/5 text-white/70 border-white/10";

  return (
    <div className={`rounded-full border px-3 py-1 text-xs ${cls}`}>
      {text}
    </div>
  );
}