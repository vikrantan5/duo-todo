"use client";
import type { Profile, Todo } from "@/lib/types";
import HeatmapRow from "./Heatmap";
import WeeklyChart from "./WeeklyChart";

export default function InsightsView({ meId, profiles, todos, members }: {
  meId: string; profiles: Profile[]; todos: Todo[]; members: { user_id: string }[];
}) {
  const partnerId = members.map(m => m.user_id).find(id => id !== meId);
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl">Insights</h1>
      <div className="grid md:grid-cols-2 gap-5">
        <WeeklyChart todos={todos} meId={meId} partnerId={partnerId} profiles={profiles} />
        <HeatmapRow todos={todos} meId={meId} partnerId={partnerId} profiles={profiles} />
      </div>
    </div>
  );
}
