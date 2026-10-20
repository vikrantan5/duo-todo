"use client";
import type { Profile, Todo } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { last7Days, completionRatio } from "@/lib/date-utils";

export default function WeeklyChart({ todos, meId, partnerId, profiles }: {
  todos: Todo[]; meId: string; partnerId?: string; profiles: Profile[];
}) {
  const days = last7Days();
  const data = days.map(d => {
    const my = todos.filter(t => t.owner_id === meId && t.date_key === d);
    const pr = partnerId ? todos.filter(t => t.owner_id === partnerId && t.date_key === d) : [];
    return {
      date: format(parseISO(d), "MMM d"),
      You: completionRatio(my.length, my.filter(t => t.is_completed).length),
      Partner: completionRatio(pr.length, pr.filter(t => t.is_completed).length),
    };
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Weekly Progress</div>
        <div className="flex items-center gap-3 text-xs muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-violet"/>You</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-emerald"/>Partner</span>
        </div>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" fontSize={10} stroke="#9199AA" />
            <YAxis fontSize={10} stroke="#9199AA" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{ background: "#171B25", border: "1px solid #272D3A", borderRadius: 10 }} />
            <Bar dataKey="You" fill="#8B7CFF" radius={[4,4,0,0]} />
            <Bar dataKey="Partner" fill="#43D9A3" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
