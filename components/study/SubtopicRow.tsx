"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { Subtopic } from "@/lib/types";
import { currentIntervalLabel, dueBucket, dueLabel } from "@/lib/study";
import { ExternalLink, StickyNote } from "lucide-react";
import { DifficultyBadge, DueBadge, RevisionPill, StatusIcon } from "./badges";

type Props = {
  subtopic: Subtopic;
  today: string;
  onComplete: (s: Subtopic) => Promise<void> | void;
  onEdit: (s: Subtopic) => void;
};

export default function SubtopicRow({ subtopic, today, onComplete, onEdit }: Props) {
  const [busy, setBusy] = useState(false);
  const bucket = dueBucket(subtopic, today);
  const dueTone = bucket === "overdue" ? "danger" : bucket === "today" ? "warn" : "violet";
  const label = subtopic.status === "not_started" ? "Mark studied" : "Mark Revision Complete";
  const interval = currentIntervalLabel(subtopic);

  async function complete() {
    if (busy) return;
    setBusy(true);
    await onComplete(subtopic);
    setBusy(false);
  }

  return (
    <div data-testid="subtopic-row" className="elev px-3 py-2 flex items-center gap-3 text-sm animate-fade-up">
      <StatusIcon status={subtopic.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate">{subtopic.title}</span>
          {subtopic.notes && <StickyNote size={12} className="muted shrink-0" />}
          {subtopic.resource_url && (
            <a
              href={subtopic.resource_url}
              target="_blank"
              rel="noreferrer"
              data-testid="subtopic-resource-link"
              className="muted hover:text-ink transition-colors duration-150"
              title={subtopic.resource_url}
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <DifficultyBadge difficulty={subtopic.difficulty} />
          {subtopic.status === "studied" && <RevisionPill count={subtopic.revision_count} />}
          {bucket && subtopic.next_due_at && bucket !== "later" && (
            <DueBadge label={dueLabel(subtopic.next_due_at, today)} tone={dueTone} />
          )}
          {interval && <span className="text-[10px] muted border border-ink-border rounded-full px-2 py-0.5">next: {interval}</span>}
          <span className="text-[11px] muted">
            {subtopic.last_revised_at
              ? `Last revised ${format(parseISO(subtopic.last_revised_at), "MMM d")}`
              : "Not started"}
          </span>
        </div>
      </div>
      <button
        onClick={() => onEdit(subtopic)}
        data-testid="subtopic-edit-button"
        className="btn btn-ghost !px-2 !py-1 text-xs"
      >
        Edit
      </button>
      <button
        onClick={() => void complete()}
        disabled={busy}
        data-testid="subtopic-complete-button"
        className="btn btn-primary !px-3 !py-1.5 text-xs active:scale-95 transition-transform duration-150 disabled:opacity-50"
      >
        {busy ? "Saving…" : label}
      </button>
    </div>
  );
}
