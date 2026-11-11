import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { RevisionEntry, StudyTopic, Subtopic } from "./types";

/** Spaced repetition schedule (days until the next revision is due). */
export const SPACED_INTERVALS = [1, 3, 7, 14] as const;
export const INTERVAL_LABELS = [
  "1-day recall",
  "3-day consolidation",
  "7-day mastery",
  "14-day retention",
] as const;

export const SUBJECT_COLORS = [
  "#8B7CFF",
  "#43D9A3",
  "#F6BD60",
  "#FF6B7A",
  "#60A5FA",
  "#F472B6",
] as const;

export const DIFFICULTY_META: Record<Subtopic["difficulty"], { label: string; color: string }> = {
  easy: { label: "Easy", color: "#43D9A3" },
  medium: { label: "Medium", color: "#F6BD60" },
  hard: { label: "Hard", color: "#FF6B7A" },
};

/** The interval that produced the subtopic's current next_due_at. */
export function currentIntervalLabel(s: Subtopic): string | null {
  if (s.status !== "studied") return null;
  return INTERVAL_LABELS[Math.min(s.revision_count, 3)];
}

/** Local-calendar day (yyyy-MM-dd) of a timestamp — matches the repo's WeeklyChart bucketing. */
export function dayOf(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

export type DueBucket = "overdue" | "today" | "upcoming" | "later";

export function dueBucket(s: Subtopic, today: string): DueBucket | null {
  if (s.status !== "studied" || !s.next_due_at) return null;
  if (s.next_due_at < today) return "overdue";
  if (s.next_due_at === today) return "today";
  const horizon = format(addDays(parseISO(today), 7), "yyyy-MM-dd");
  if (s.next_due_at <= horizon) return "upcoming";
  return "later";
}

export function isDue(s: Subtopic, today: string): boolean {
  const b = dueBucket(s, today);
  return b === "overdue" || b === "today";
}

export function dueLabel(nextDue: string, today: string): string {
  const diff = differenceInCalendarDays(parseISO(nextDue), parseISO(today));
  if (diff < 0) return `Overdue by ${-diff}d`;
  if (diff === 0) return "Due today";
  return `In ${diff}d`;
}

export type TopicState = "not_started" | "in_progress" | "completed";

export function topicState(subs: Subtopic[]): TopicState {
  if (subs.length === 0) return "not_started";
  const studied = subs.filter((s) => s.status === "studied").length;
  if (studied === 0) return "not_started";
  return studied === subs.length ? "completed" : "in_progress";
}

export function subjectProgress(subs: Subtopic[]): { studied: number; total: number; pct: number } {
  const total = subs.length;
  const studied = subs.filter((s) => s.status === "studied").length;
  return { studied, total, pct: total === 0 ? 0 : Math.round((studied / total) * 100) };
}

export type StudyStats = {
  studyCompletion: number;
  /** % of studied subtopics that are on schedule with their spaced-repetition plan. */
  revisionCompletion: number;
  topicsStudied: number;
  totalTopics: number;
  totalSubtopics: number;
  /** History rows = first studies + later revisions. */
  totalRevisions: number;
};

export function computeStats(subtopics: Subtopic[], topics: StudyTopic[], today: string): StudyStats {
  const totalSubtopics = subtopics.length;
  const studied = subtopics.filter((s) => s.status === "studied");
  const onSchedule = studied.filter((s) => !s.next_due_at || s.next_due_at >= today).length;
  const topicsStudied = topics.filter((t) => {
    const subs = subtopics.filter((s) => s.topic_id === t.id);
    return topicState(subs) === "completed";
  }).length;
  const totalRevisions =
    studied.length + studied.reduce((acc, s) => acc + s.revision_count, 0);
  return {
    studyCompletion:
      totalSubtopics === 0 ? 0 : Math.round((studied.length / totalSubtopics) * 100),
    revisionCompletion:
      studied.length === 0 ? 0 : Math.round((onSchedule / studied.length) * 100),
    topicsStudied,
    totalTopics: topics.length,
    totalSubtopics,
    totalRevisions,
  };
}

/** Consecutive revision days ending today (or yesterday, grace). */
export function revisionStreak(history: RevisionEntry[], today: string): number {
  const days = new Set(history.map((h) => dayOf(h.revised_at)));
  let cursor = days.has(today)
    ? today
    : format(addDays(parseISO(today), -1), "yyyy-MM-dd");
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = format(addDays(parseISO(cursor), -1), "yyyy-MM-dd");
  }
  return streak;
}
