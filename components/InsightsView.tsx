"use client";
import type {
  Profile,
  RevisionEntry,
  StudySession,
  StudyTopic,
  Subject,
  Subtopic,
  Todo,
  WeeklyStudyRow,
} from "@/lib/types";
import HeatmapRow from "./Heatmap";
import WeeklyChart from "./WeeklyChart";
import StudyReport from "./study/StudyOverview";

type Props = {
  meId: string;
  tz: string;
  profiles: Profile[];
  todos: Todo[];
  members: { user_id: string }[];
  subjects: Subject[];
  topics: StudyTopic[];
  subtopics: Subtopic[];
  history: RevisionEntry[];
  weeklyRows: WeeklyStudyRow[];
  sessions: StudySession[];
};

export default function InsightsView(p: Props) {
  const partnerId = p.members.map((m) => m.user_id).find((id) => id !== p.meId);
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl">Insights</h1>
      <div className="grid md:grid-cols-2 gap-5">
        <WeeklyChart todos={p.todos} meId={p.meId} partnerId={partnerId} profiles={p.profiles} />
        <HeatmapRow todos={p.todos} meId={p.meId} partnerId={partnerId} profiles={p.profiles} />
      </div>
      <StudyReport
        meId={p.meId}
        tz={p.tz}
        subjects={p.subjects}
        topics={p.topics}
        subtopics={p.subtopics}
        history={p.history}
        weeklyRows={p.weeklyRows}
        sessions={p.sessions}
      />
    </div>
  );
}