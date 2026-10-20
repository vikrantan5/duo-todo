"use client";
import { useMemo, useState } from "react";
import type { Profile, Todo } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { completionRatio } from "@/lib/date-utils";

export default function HistoryView({ meId, profiles, todos }: {
  meId: string; profiles: Profile[]; todos: Todo[];
}) {
  const [who, setWho] = useState<"me"|"partner"|"both">("both");
  const partnerId = profiles.find(p => p.id !== meId)?.id;

  const grouped = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of todos) {
      if (who === "me" && t.owner_id !== meId) continue;
      if (who === "partner" && t.owner_id !== partnerId) continue;
      const arr = map.get(t.date_key) || [];
      arr.push(t); map.set(t.date_key, arr);
    }
    return [...map.entries()].sort((a,b) => b[0].localeCompare(a[0]));
  }, [todos, who, meId, partnerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl">History</h1>
        <div className="ml-auto flex gap-1 elev p-1">
          {(["me","partner","both"] as const).map(k => (
            <button key={k} onClick={() => setWho(k)}
              className={`px-3 py-1 text-xs rounded-md ${who === k ? "bg-brand-violet/90 text-[#0B0D12]" : "muted"}`}>
              {k[0].toUpperCase()+k.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {grouped.length === 0 && <div className="elev p-6 text-sm muted">No history yet.</div>}
      {grouped.map(([date, list]) => {
        const done = list.filter(t => t.is_completed).length;
        return (
          <div key={date} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{format(parseISO(date), "EEEE, MMMM d, yyyy")}</div>
              <div className="text-xs muted">{done} / {list.length} • {completionRatio(list.length, done)}%</div>
            </div>
            <div className="space-y-1.5">
              {list.map(t => (
                <div key={t.id} className="elev p-2 flex items-center gap-3 text-sm">
                  <span className={`h-4 w-4 rounded-md grid place-items-center ${t.is_completed ? "bg-brand-emerald text-[#0B0D12]" : "border border-ink-border"}`}>
                    {t.is_completed ? "✓" : ""}
                  </span>
                  <span className={t.is_completed ? "line-through opacity-60" : ""}>{t.title}</span>
                  <span className="ml-auto text-[10px] muted">{t.owner_id === meId ? "You" : "Partner"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
