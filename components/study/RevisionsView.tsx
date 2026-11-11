"use client";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { RevisionEntry, StudyTopic, Subject, Subtopic } from "@/lib/types";
import { currentIntervalLabel, dayOf, dueBucket, dueLabel, revisionStreak } from "@/lib/study";
import { todayKey } from "@/lib/utils";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { DifficultyBadge, DueBadge } from "./badges";

type Props = {
  meId: string;
  tz: string;
  subjects: Subject[];
  topics: StudyTopic[];
  subtopics: Subtopic[];
  history: RevisionEntry[];
};

export default function RevisionsView(p: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [subtopics, setSubtopics] = useState(p.subtopics);
  const [history, setHistory] = useState(p.history);
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => setSubtopics(p.subtopics), [p.subtopics]);
  useEffect(() => setHistory(p.history), [p.history]);

  const today = todayKey(p.tz);
  const subjectById = useMemo(() => new Map(p.subjects.map((s) => [s.id, s])), [p.subjects]);
  const topicById = useMemo(() => new Map(p.topics.map((t) => [t.id, t])), [p.topics]);
  const subtopicById = useMemo(() => new Map(subtopics.map((s) => [s.id, s])), [subtopics]);

  // Own-row realtime so freshly completed revisions move queues instantly.
  useEffect(() => {
    const ch = supabase
      .channel(`revisions:${p.meId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtopics" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setSubtopics((prev) => prev.filter((x) => x.id !== (payload.old as Subtopic).id));
        } else {
          const row = payload.new as Subtopic;
          setSubtopics((prev) =>
            prev.some((x) => x.id === row.id) ? prev.map((x) => (x.id === row.id ? row : x)) : prev,
          );
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "revision_history" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as RevisionEntry;
          setHistory((prev) => (prev.some((h) => h.id === row.id) ? prev : [row, ...prev]));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [p.meId, supabase]);

  const meta = (s: Subtopic) => {
    const topic = topicById.get(s.topic_id);
    const subject = topic ? subjectById.get(topic.subject_id) : undefined;
    return { subject: subject?.name ?? "—", color: subject?.color ?? "#8B7CFF", topic: topic?.title ?? "—" };
  };

  const inScope = (s: Subtopic) => {
    const b = dueBucket(s, today);
    return b === "overdue" || b === "today" || b === "upcoming";
  };
  const due = subtopics.filter(inScope);
  const overdue = due.filter((s) => dueBucket(s, today) === "overdue");
  const dueToday = due.filter((s) => dueBucket(s, today) === "today");
  const upcoming = due.filter((s) => dueBucket(s, today) === "upcoming");

   const streak = useMemo(() => revisionStreak(history, today, p.tz), [history, today, p.tz]);
  const last7 = new Set(Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), -i), "yyyy-MM-dd")));
  const weekCount = history.filter((h) => last7.has(dayOf(h.revised_at))).length;

  async function complete(s: Subtopic) {
    if (busyId) return;
    setBusyId(s.id);
    const { data, error } = await supabase.rpc("complete_revision", { _subtopic_id: s.id }).single();
    setBusyId(null);
    if (error || !data) {
      toast.error(error?.message ?? "Could not complete revision");
      return;
    }
    const updated = data as Subtopic;
    setSubtopics((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    toast.success(`Revision ${updated.revision_count} complete — next due ${updated.next_due_at ?? "soon"}`);
  }

  const timeline = useMemo(() => {
    const groups = new Map<string, RevisionEntry[]>();
    for (const h of history.slice(0, 80)) {
      const d = dayOf(h.revised_at);
      const arr = groups.get(d) ?? [];
      arr.push(h);
      groups.set(d, arr);
    }
    return [...groups.entries()];
  }, [history]);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl">Revision Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5 flex items-center gap-4" data-testid="revision-streak-card">
          <div
            className="h-12 w-12 rounded-full grid place-items-center shrink-0"
            style={{ background: "rgba(246,189,96,0.15)", border: "1px solid rgba(246,189,96,0.4)" }}
          >
            <Flame size={22} style={{ color: "#F6BD60" }} />
          </div>
          <div>
            <div className="font-display text-2xl">
              {streak} day{streak === 1 ? "" : "s"}
            </div>
            <div className="muted text-sm">Revision streak · {weekCount} this week</div>
          </div>
        </div>
        <div className="card p-5 md:col-span-2 grid grid-cols-3 gap-3 text-center" data-testid="revision-queue-stats">
          <Stat value={overdue.length} label="Overdue" color="#FF6B7A" />
          <Stat value={dueToday.length} label="Due today" color="#F6BD60" />
          <Stat value={upcoming.length} label="Next 7 days" color="#8B7CFF" />
        </div>
      </div>

      {due.length === 0 ? (
        <div className="card p-10 text-center animate-fade-up" data-testid="empty-revisions-placeholder">
          <p className="font-display text-lg">All caught up on revisions!</p>
          <p className="muted text-sm mt-1">
            Zero topics due right now — your memory curve is on schedule. Check the history below or keep studying in
            My Subjects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-testid="due-revisions-grid">
          <QueueColumn
            title="Overdue"
            tone="#FF6B7A"
            items={overdue}
            today={today}
            meta={meta}
            busyId={busyId}
            onComplete={complete}
          />
          <QueueColumn
            title="Due today"
            tone="#F6BD60"
            items={dueToday}
            today={today}
            meta={meta}
            busyId={busyId}
            onComplete={complete}
          />
          <QueueColumn
            title="Upcoming 7 days"
            tone="#8B7CFF"
            items={upcoming}
            today={today}
            meta={meta}
            busyId={busyId}
            onComplete={complete}
          />
        </div>
      )}

      <div className="card p-5" data-testid="revision-history-timeline">
        <div className="font-semibold mb-3">Revision history</div>
        {timeline.length === 0 ? (
          <div className="elev p-4 text-sm muted">No revisions recorded yet — mark a subtopic studied to start.</div>
        ) : (
          <div className="space-y-4">
            {timeline.map(([day, entries]) => (
              <div key={day}>
                <div className="text-xs muted mb-2">{format(parseISO(day), "EEEE, MMM d, yyyy")}</div>
                <div className="space-y-2">
                  {entries.map((h) => {
                    const sub = subtopicById.get(h.subtopic_id);
                    const m = sub ? meta(sub) : null;
                    return (
                      <div key={h.id} className="elev px-3 py-2 flex items-center gap-3 text-sm">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: m?.color ?? "#8B7CFF" }}
                        />
                        <span className="truncate flex-1">
                          {sub?.title ?? "Deleted subtopic"}
                          <span className="muted text-xs"> · {m?.subject ?? ""}</span>
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap"
                          style={{
                            background:
                              h.revision_number === 0 ? "rgba(67,217,163,0.12)" : "rgba(139,124,255,0.12)",
                            color: h.revision_number === 0 ? "#6EE7B7" : "#AEA3FF",
                          }}
                        >
                          {h.revision_number === 0 ? "First study" : `Revision ${h.revision_number}`}
                        </span>
                        <span className="text-[11px] muted whitespace-nowrap hidden sm:inline">
                          {format(parseISO(h.revised_at), "HH:mm")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="elev p-3">
      <div className="font-display text-2xl" style={{ color }}>
        {value}
      </div>
      <div className="muted text-xs mt-0.5">{label}</div>
    </div>
  );
}

function QueueColumn({
  title,
  tone,
  items,
  today,
  meta,
  busyId,
  onComplete,
}: {
  title: string;
  tone: string;
  items: Subtopic[];
  today: string;
  meta: (s: Subtopic) => { subject: string; color: string; topic: string };
  busyId: string | null;
  onComplete: (s: Subtopic) => Promise<void> | void;
}) {
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${tone}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-sm">{title}</span>
        <span className="text-xs muted">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <div className="elev p-3 text-xs muted">Nothing here.</div>}
        {items.map((s) => {
          const m = meta(s);
          const bucket = dueBucket(s, today);
          return (
            <div key={s.id} className="elev p-3 space-y-2" data-testid="due-revision-item">
              <div className="flex items-center gap-2 text-xs muted">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="truncate">
                  {m.subject} · {m.topic}
                </span>
              </div>
              <div className="font-medium text-sm">{s.title}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <DifficultyBadge difficulty={s.difficulty} />
                {s.next_due_at && (
                  <DueBadge
                    label={dueLabel(s.next_due_at, today)}
                    tone={bucket === "overdue" ? "danger" : bucket === "today" ? "warn" : "violet"}
                  />
                )}
                {currentIntervalLabel(s) && (
                  <span className="text-[10px] muted border border-ink-border rounded-full px-2 py-0.5">
                    next: {currentIntervalLabel(s)}
                  </span>
                )}
              </div>
              <button
                className="btn btn-primary w-full !py-1.5 text-xs active:scale-95 transition-transform duration-150"
                disabled={busyId === s.id}
                onClick={() => void onComplete(s)}
                data-testid="due-item-complete-button"
              >
                {busyId === s.id ? "Saving…" : "Mark Revision Complete"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
