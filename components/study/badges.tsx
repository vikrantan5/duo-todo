import { CheckCircle2, Clock } from "lucide-react";
import { DIFFICULTY_META } from "@/lib/study";
import type { Subtopic } from "@/lib/types";

export function DifficultyBadge({ difficulty }: { difficulty: Subtopic["difficulty"] }) {
  const m = DIFFICULTY_META[difficulty];
  return (
    <span
      data-testid={`difficulty-badge-${m.label.toLowerCase()}`}
      className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: `${m.color}1F`, color: m.color, border: `1px solid ${m.color}55` }}
    >
      {m.label}
    </span>
  );
}

export function RevisionPill({ count }: { count: number }) {
  return (
    <span
      data-testid="revision-pill"
      className="px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap"
      style={{ background: "rgba(139,124,255,0.12)", color: "#AEA3FF", border: "1px solid rgba(139,124,255,0.35)" }}
    >
      {count} {count === 1 ? "revision" : "revisions"}
    </span>
  );
}

const TONES = {
  danger: { bg: "rgba(255,107,122,0.12)", fg: "#FF8A96", border: "rgba(255,107,122,0.4)" },
  warn: { bg: "rgba(246,189,96,0.12)", fg: "#FFD37A", border: "rgba(246,189,96,0.4)" },
  violet: { bg: "rgba(139,124,255,0.12)", fg: "#8BB7FF", border: "rgba(139,124,255,0.4)" },
  emerald: { bg: "rgba(67,217,163,0.12)", fg: "#6EE7B7", border: "rgba(67,217,163,0.4)" },
} as const;

export function DueBadge({
  label,
  tone,
  testId,
}: {
  label: string;
  tone: keyof typeof TONES;
  testId?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      data-testid={testId ?? "due-badge"}
      className="px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}
    >
      {label}
    </span>
  );
}

export function StatusIcon({ status }: { status: Subtopic["status"] }) {
  if (status === "studied") return <CheckCircle2 size={15} className="text-state-success shrink-0" />;
  return <Clock size={15} className="muted shrink-0" />;
}

export function ProgressBar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="rounded-full overflow-hidden flex-1" style={{ height, background: "rgba(255,255,255,0.08)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  );
}
