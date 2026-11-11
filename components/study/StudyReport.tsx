"use client";
import { useMemo } from "react";
import { BarChart, Bar, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { addDays, format, parseISO } from "date-fns";
import type { RevisionEntry, StudySession, StudyTopic, Subject, Subtopic, WeeklyStudyRow } from "@/lib/types";
import { dayOf } from "@/lib/study";
import { last7Days } from "@/lib/date-utils";
import { ProgressBar } from "./badges";

type Props = {
  meId: string;
  subjects: Subject[];
  topics: StudyTopic[];
  subtopics: Subtopic[];
  history: RevisionEntry[];
  weeklyRows: WeeklyStudyRow[];
  sessions: StudySession[];
};

export default function StudyReport(p: Props) {
  const days = last7Days();

  const chartData = days.map((d) => ({
    date: format(parseISO(d), "MMM d"),
    You: p.weeklyRows
      .filter((r) => r.user_id === p.meId && String(r.day).slice(0, 10) === d)
      .reduce((a, r) => a + Number(r.revisions), 0),
    Partner: p.weeklyRows
      .filter((r) => r.user_id !== p.meId && String(r.day).slice(0, 10) === d)
      .reduce((a, r) => a + Number(r.revisions), 0),
  }));

  const firstThis = p.history.filter((h) => h.revision_number === 0 && days.includes(dayOf(h.revised_at))).length;
  const prevWeekDays = new Set(
    Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), -(7 + i)), "yyyy-MM-dd")),
  );
  const firstPrev = p.history.filter((h) => h.revision_number === 0 && prevWeekDays.has(dayOf(h.revised_at))).length;

  const weekSessions = p.sessions.filter((s) => days.includes(dayOf(s.created_at)));
  const minutes = weekSessions.reduce((a, s) => a + s.duration_minutes, 0);

  const distribution = useMemo(() => {
    const topicById = new Map(p.topics.map((t) => [t.id, t]));
    const subjectById = new Map(p.subjects.map((s) => [s.id, s]));
    const counts = new Map<string, number>();
    for (const h of p.history) {
      const sub = p.subtopics.find((x) => x.id === h.subtopic_id);
      const topic = sub ? topicById.get(sub.topic_id) : undefined;
      const subject = topic ? subjectById.get(topic.subject_id) : undefined;
      if (subject) counts.set(subject.name, (counts.get(subject.name) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => ({ name, n, pct: Math.round((n / max) * 100) }));
  }, [p.history, p.subjects, p.subtopics, p.topics]);

  return (
    <div className="space-y-5" data-testid="study-report-section">
      <h2 className="font-display text-lg">Weekly study report</h2>
      <div className="grid md:grid-cols-3 gap-5">
        <div className="card p-5 md:col-span-2" data-testid="weekly-revisions-chart">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Revisions per day</div>
            <div className="flex items-center gap-3 text-xs muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-brand-violet" />
                You
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-brand-emerald" />
                Partner
              </span>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" fontSize={10} stroke="#9199AA" />
                <YAxis fontSize={10} stroke="#9199AA" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#171B25", border: "1px solid #272D3A", borderRadius: 10 }} />
                <Bar dataKey="You" fill="#8B7CFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Partner" fill="#43D9A3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-5">
          <div className="card p-5" data-testid="first-study-metric">
            <div className="muted text-xs">First studies this week</div>
            <div className="font-display text-3xl mt-1">{firstThis}</div>
            <div className="text-xs muted mt-1">
              {firstPrev === 0
                ? firstThis > 0
                  ? `+${firstThis} vs last week`
                  : "No first studies yet"
                : `${firstThis >= firstPrev ? "+" : ""}${firstThis - firstPrev} vs last week (${firstPrev})`}
            </div>
          </div>
          <div className="card p-5" data-testid="study-minutes-summary">
            <div className="muted text-xs">Logged study time</div>
            <div className="font-display text-3xl mt-1">
              {Math.floor(minutes / 60)}h {minutes % 60}m
            </div>
            <div className="text-xs muted mt-1">across {weekSessions.length} session{weekSessions.length === 1 ? "" : "s"} this week</div>
          </div>
        </div>
      </div>
      <div className="card p-5" data-testid="subject-revision-distribution">
        <div className="font-semibold mb-3">Revisions by subject</div>
        {distribution.length === 0 ? (
          <div className="elev p-4 text-sm muted">
            No revisions recorded yet — mark a subtopic studied to start the history.
          </div>
        ) : (
          <div className="space-y-2">
            {distribution.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-sm w-44 truncate">{d.name}</span>
                <ProgressBar pct={d.pct} color="#8B7CFF" height={6} />
                <span className="text-xs muted w-10 text-right">{d.n}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
