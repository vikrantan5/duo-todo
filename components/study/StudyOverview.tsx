"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  RevisionEntry,
  StudySession,
  StudyTopic,
  Subject,
  Subtopic,
  WeeklyStudyRow,
} from "@/lib/types";
import { computeStats, isDue, revisionStreak, subjectProgress } from "@/lib/study";
import { todayKey } from "@/lib/utils";
import { AlertCircle, BookOpen, Flame, Layers, Repeat } from "lucide-react";
import { ProgressRing } from "../ProgressRing";
import { ProgressBar } from "./badges";

type Props = {
  meId: string;
  tz: string;
  subjects: Subject[];
  topics: StudyTopic[];
  subtopics: Subtopic[];
  history: RevisionEntry[];
  weeklyRows: WeeklyStudyRow[];
  sessions: StudySession[];
};

export default function StudyOverview(p: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = todayKey(p.tz);

  // Keep the analytics section live while revisions happen in other tabs.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    const ch = supabase
      .channel(`study-overview:${p.meId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects", filter: `user_id=eq.${p.meId}` },
        schedule,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "topics" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtopics" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "revision_history" }, schedule)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [p.meId, router, supabase]);

  const stats = useMemo(() => computeStats(p.subtopics, p.topics, today), [p.subtopics, p.topics, today]);
  const streak = useMemo(() => revisionStreak(p.history, today, p.tz), [p.history, today, p.tz]);
  const dueCount = p.subtopics.filter((s) => isDue(s, today)).length;
  const top = useMemo(
    () =>
      p.subjects
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => {
          const sTopics = new Set(p.topics.filter((t) => t.subject_id === s.id).map((t) => t.id));
          return { subject: s, prog: subjectProgress(p.subtopics.filter((x) => sTopics.has(x.topic_id))) };
        })
        .slice(0, 5),
    [p.subjects, p.subtopics, p.topics],
  );

  // Weekly aggregates for the current user
  const myWeekly = useMemo(
    () => p.weeklyRows.filter((r) => r.user_id === p.meId),
    [p.weeklyRows, p.meId],
  );
  const weeklyRevisions = myWeekly.reduce((n, r) => n + Number(r.revisions), 0);
  const weeklyFirstStudies = myWeekly.reduce((n, r) => n + Number(r.first_studies), 0);

  // Session totals for the current user
  const mySessionMinutes = useMemo(
    () => p.sessions.filter((s) => s.user_id === p.meId).reduce((n, s) => n + (s.duration_minutes ?? 0), 0),
    [p.sessions, p.meId],
  );

  return (
    <div className="card p-5 animate-fade-up" data-testid="study-overview-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg flex items-center gap-2">
          <BookOpen size={18} className="text-brand-violet" /> Study Analytics
        </h2>
        <Link href="/revisions" data-testid="study-overview-tracker-link" className="btn btn-ghost !py-1 text-xs">
          Revision Tracker →
        </Link>
      </div>

      {dueCount > 0 && (
        <div
          className="elev p-3 mb-4 flex items-center gap-2 text-sm"
          style={{ background: "rgba(246,189,96,0.08)", border: "1px solid rgba(246,189,96,0.35)" }}
          data-testid="dashboard-due-today-banner"
        >
          <AlertCircle size={15} className="text-state-warn shrink-0" />
          <span>
            <b>{dueCount}</b> subtopic{dueCount === 1 ? "" : "s"} due for revision — spaced repetition works best on
            time.
          </span>
          <Link href="/revisions" className="btn btn-ghost !py-1 text-xs ml-auto">
            Review now
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="flex items-center gap-5">
          <div data-testid="dashboard-study-ring">
            <ProgressRing
              value={stats.studyCompletion}
              size={110}
              color="#8B7CFF"
              label={
                <div className="text-center">
                  <div className="text-lg font-semibold">{stats.studyCompletion}%</div>
                  <div className="text-[10px] muted">
                    {p.subtopics.filter((s) => s.status === "studied").length} / {p.subtopics.length} done
                  </div>
                </div>
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Chip icon={<Layers size={11} />} label="Topics studied" value={`${stats.topicsStudied}/${stats.totalTopics}`} />
            <Chip icon={<Repeat size={11} />} label="Total revisions" value={String(stats.totalRevisions)} />
            <Chip icon={<Flame size={11} />} label="Revision streak" value={`${streak}d`} warn />
            <Chip icon={<AlertCircle size={11} />} label="Revision health" value={`${stats.revisionCompletion}%`} />
          </div>
        </div>
        <div className="space-y-2" data-testid="dashboard-top-subjects">
          {top.length === 0 && (
            <div className="elev p-4 text-sm muted">
              No subjects yet — open My Subjects to create your first study subject.
            </div>
          )}
          {top.map(({ subject, prog }) => (
            <div key={subject.id} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: subject.color }} />
              <span className="text-sm w-40 truncate">{subject.name}</span>
              <ProgressBar pct={prog.pct} color={subject.color} height={6} />
              <span className="text-xs muted w-24 text-right whitespace-nowrap">
                {prog.studied}/{prog.total} · {prog.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5" data-testid="study-overview-weekly">
        <Chip icon={<Repeat size={11} />} label="Revisions this week" value={String(weeklyRevisions)} />
        <Chip icon={<BookOpen size={11} />} label="First studies this week" value={String(weeklyFirstStudies)} />
        <Chip icon={<Layers size={11} />} label="Session minutes" value={String(mySessionMinutes)} />
        <Chip icon={<Flame size={11} />} label="Active days" value={String(myWeekly.length)} warn />
      </div>
    </div>
  );
}

function Chip({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <div className="elev p-2.5">
      <div className="text-[11px] muted flex items-center gap-1">
        <span style={warn ? { color: "#F6BD60" } : undefined}>{icon}</span> {label}
      </div>
      <div className="font-semibold mt-0.5">{value}</div>
    </div>
  );
}