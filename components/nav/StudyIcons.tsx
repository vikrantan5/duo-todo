import type { SVGProps } from "react";

type StudyIconProps = SVGProps<SVGSVGElement> & {
  kind: "subjects" | "revisions";
  size?: number;
  mono?: boolean;
};

const SUBJECTS_COLOR = "#8B7CFF";
const SUBJECTS_ACCENT = "#F5F7FB";
const REVISIONS_COLOR = "#F6BD60";
const REVISIONS_ACCENT = "#FF8A5B";

export function StudyIcon({ kind, size = 16, mono = false, ...rest }: StudyIconProps) {
  if (kind === "subjects") {
    const main = mono ? "currentColor" : SUBJECTS_COLOR;
    const accent = mono ? "currentColor" : SUBJECTS_ACCENT;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>
        <path d="M5 4.5h9.5A3.5 3.5 0 0 1 18 8v11.5H8A3 3 0 0 1 5 16.5v-12Z" stroke={main} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8.5 8h6M8.5 11h6M8.5 14h3.5" stroke={main} strokeWidth="1.7" strokeLinecap="round" opacity="0.75" />
        <path d="M15.5 4.5v5.5l-2-1.4-2 1.4V4.5" fill={accent} opacity={mono ? 0.9 : 1} />
      </svg>
    );
  }

  const main = mono ? "currentColor" : REVISIONS_COLOR;
  const accent = mono ? "currentColor" : REVISIONS_ACCENT;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>
      <path d="M19 12a7 7 0 1 1-2.05-4.95" stroke={main} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M19.5 4.5v4h-4" stroke={main} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.8" fill={accent} />
    </svg>
  );
}