"use client";
import type { Profile, Todo } from "@/lib/types";
import { completionRatio } from "@/lib/date-utils";
import { Trophy } from "lucide-react";

export default function LeaderCard({ me, partner, myTodos, partnerTodos }: {
  me: Profile; partner?: Profile; myTodos: Todo[]; partnerTodos: Todo[];
}) {
  const myDone = myTodos.filter(t => t.is_completed).length;
  const pDone = partnerTodos.filter(t => t.is_completed).length;
  const myPct = completionRatio(myTodos.length, myDone);
  const pPct = completionRatio(partnerTodos.length, pDone);
  const msg = myDone === pDone ? "You're tied! Keep going!" : myDone > pDone ? "You're leading!" : `${partner?.display_name ?? "Partner"} leads.`;

  const Row = ({ name, pct, done, total, color }: { name: string; pct: number; done: number; total: number; color: string }) => (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full grid place-items-center font-semibold" style={{ background: `${color}22`, color }}>{name[0]?.toUpperCase()}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{name}</div>
        <div className="muted text-xs">{done} / {total}  •  {pct}%</div>
        <div className="h-1 mt-1 rounded-full bg-ink-border/50 overflow-hidden">
          <div className="h-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 font-semibold"><Trophy size={16} className="text-amber-300" /> Who's leading today?</div>
      <div className="space-y-4">
        <Row name={me.display_name || "You"} pct={myPct} done={myDone} total={myTodos.length} color="#8B7CFF" />
        <div className="text-center text-xs muted italic">{msg}</div>
        <Row name={partner?.display_name ?? "Partner"} pct={pPct} done={pDone} total={partnerTodos.length} color="#43D9A3" />
      </div>
    </div>
  );
}
