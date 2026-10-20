"use client";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Todo, UserStats } from "@/lib/types";
import { ProgressRing } from "./ProgressRing";
import TaskItem from "./TaskItem";
import { Plus, Search, Pencil, Flame } from "lucide-react";
import { completionRatio } from "@/lib/date-utils";
import { levelFromXp } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  me?: boolean;
  profile: Profile;
  todos: Todo[];
  target: number;
  stats?: UserStats;
  accent: string;
  dateKey: string;
  duoId: string;
  supabase: SupabaseClient;
};

export default function UserPanel({ me, profile, todos, target, stats, accent, dateKey, duoId, supabase }: Props) {
  const [filter, setFilter] = useState<"all"|"pending"|"completed">("all");
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const done = todos.filter(t => t.is_completed).length;
  const pct = completionRatio(todos.length, done);
  const level = levelFromXp(stats?.total_xp ?? 0);

  const filtered = todos
    .filter(t => filter === "all" ? true : filter === "pending" ? !t.is_completed : t.is_completed)
    .filter(t => query ? t.title.toLowerCase().includes(query.toLowerCase()) : true);

  async function addTask() {
    if (!newTitle.trim() || !me) return;
    const title = newTitle.trim();
    setNewTitle("");
    const position = Math.max(0, ...todos.map(t => t.position)) + 1;
    const { error } = await supabase.from("todos").insert({
      duo_id: duoId, owner_id: profile.id, title, priority: "medium", position, date_key: dateKey
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="card p-5 relative overflow-hidden" style={{ boxShadow: `inset 0 0 0 1px ${accent}22` }}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-full grid place-items-center text-xl font-semibold"
          style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}66` }}>
          {profile.display_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{profile.display_name || "—"}</span>
            {me && <Pencil size={12} className="muted" />}
          </div>
          <div className="muted text-sm flex items-center gap-2 mt-0.5">
            <Flame size={14} style={{ color: "#F6BD60" }} />
            {stats?.current_streak ?? 0} day streak
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs rounded-full border border-ink-border" style={{ color: accent }}>Level {level.level}</span>
            <div className="h-1.5 bg-ink-border/50 rounded-full flex-1 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(level.into / level.needed) * 100}%`, background: accent }} />
            </div>
            <span className="text-xs muted">{level.into} / {level.needed} XP</span>
          </div>
        </div>
        <ProgressRing value={pct} color={accent} size={76}
          label={<div className="text-center"><div className="text-base font-semibold">{pct}%</div><div className="text-[10px] muted">Today<br/>{done} / {todos.length}</div></div>} />
      </div>

      {/* Target */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="elev p-3">
          <div className="flex justify-between text-xs muted"><span>Daily Goal Target</span><span>{target}%</span></div>
          <div className="h-1.5 bg-ink-border/50 mt-2 rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${target}%`, background: accent }} />
          </div>
        </div>
        <div className="elev p-3">
          <div className="flex justify-between text-xs muted"><span>Actual Progress</span><span>{pct}%</span></div>
          <div className="h-1.5 bg-ink-border/50 mt-2 rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${pct}%`, background: accent }} />
          </div>
        </div>
      </div>

      {/* Composer */}
      {me && (
        <div className="elev mt-4 p-2 pl-3 flex items-center gap-2">
          <Search size={14} className="muted" />
          <input className="bg-transparent outline-none flex-1 text-sm" placeholder="Add a new task..."
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTask(); }} />
          <span className="text-[10px] muted hidden md:inline">Press Enter to add</span>
          <button onClick={addTask} className="rounded-md p-1.5" style={{ background: accent, color: "#0B0D12" }}><Plus size={14}/></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {(["all","pending","completed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs ${filter === f ? "" : "muted border border-ink-border"}`}
            style={filter === f ? { background: `${accent}22`, color: accent, border: `1px solid ${accent}66` } : {}}>
            {f[0].toUpperCase() + f.slice(1)} <span className="ml-1 opacity-70">{f === "all" ? todos.length : f === "pending" ? todos.length - done : done}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 elev px-2 py-1 w-44">
          <Search size={12} className="muted" />
          <input className="bg-transparent outline-none text-xs w-full" placeholder="Search tasks..."
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      {/* List */}
      <div className="mt-3 space-y-2">
        {filtered.length === 0 && <div className="elev p-4 text-sm muted">No tasks yet.</div>}
        {filtered.sort((a,b) => a.position - b.position).map(t => (
          <TaskItem key={t.id} todo={t} canEdit={!!me} accent={accent} supabase={supabase} />
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 flex items-center justify-between text-xs muted">
        <div className="flex items-center gap-3">
          <span>✓ {done} completed</span>
          <span>• {todos.length - done} pending</span>
        </div>
        <span>{todos.reduce((a,t)=>a+(t.duration_minutes??0),0)}m total</span>
      </div>
    </div>
  );
}
