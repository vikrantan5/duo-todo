"use client";
import type { Profile, Todo } from "@/lib/types";
import { last365Days, completionRatio } from "@/lib/date-utils";
import { useMemo } from "react";

function intensity(pct: number) {
  if (pct <= 0) return 0;
  if (pct < 25) return 1;
  if (pct < 50) return 2;
  if (pct < 75) return 3;
  return 4;
}
const SHADES_V = ["rgba(139,124,255,0.08)", "rgba(139,124,255,0.25)", "rgba(139,124,255,0.5)", "rgba(139,124,255,0.75)", "#8B7CFF"];
const SHADES_E = ["rgba(67,217,163,0.08)", "rgba(67,217,163,0.25)", "rgba(67,217,163,0.5)", "rgba(67,217,163,0.75)", "#43D9A3"];

function HeatmapGrid({ todos, uid, shades }: { todos: Todo[]; uid: string; shades: string[] }) {
  const days = useMemo(() => last365Days(), []);
  const cols: string[][] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  const dayPct = (d: string) => {
    const list = todos.filter(t => t.owner_id === uid && t.date_key === d);
    return completionRatio(list.length, list.filter(t => t.is_completed).length);
  };

  return (
    <div className="flex gap-[2px] overflow-x-auto">
      {cols.map((c, ci) => (
        <div key={ci} className="flex flex-col gap-[2px]">
          {c.map(d => {
            const p = dayPct(d);
            return (
              <div key={d} title={`${d}: ${p}%`}
                className="h-2.5 w-2.5 rounded-[2px]" style={{ background: shades[intensity(p)] }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function HeatmapRow({ todos, meId, partnerId, profiles }: {
  todos: Todo[]; meId: string; partnerId?: string; profiles: Profile[];
}) {
  const avg = (uid: string) => {
    const days = last365Days();
    const vals = days.map(d => {
      const list = todos.filter(t => t.owner_id === uid && t.date_key === d);
      return list.length ? completionRatio(list.length, list.filter(t => t.is_completed).length) : null;
    }).filter((v): v is number => v !== null);
    return vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length) : 0;
  };

  const partner = profiles.find(p => p.id === partnerId);

  return (
    <div className="card p-5">
      <div className="font-semibold mb-4">Contribution Heatmap</div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm">You</span>
            <span className="text-xs muted">{avg(meId)}% avg</span>
          </div>
          <HeatmapGrid todos={todos} uid={meId} shades={SHADES_V} />
        </div>
        {partnerId && (
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm">{partner?.display_name ?? "Partner"}</span>
              <span className="text-xs muted">{avg(partnerId)}% avg</span>
            </div>
            <HeatmapGrid todos={todos} uid={partnerId} shades={SHADES_E} />
          </div>
        )}
      </div>
    </div>
  );
}
