"use client";
import type { Profile, Todo } from "@/lib/types";
import { ProgressRing } from "./ProgressRing";
import { Trophy, ChevronDown } from "lucide-react";
import { useState } from "react";
import { completionRatio } from "@/lib/date-utils";

export default function AccountabilityBanner({
  me, partner, myTodos, partnerTodos, onCheer,
}: {
  me: Profile; partner?: Profile;
  myTodos: Todo[]; partnerTodos: Todo[];
  onCheer: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const myDone = myTodos.filter(t => t.is_completed).length;
  const pDone = partnerTodos.filter(t => t.is_completed).length;
  const myPct = completionRatio(myTodos.length, myDone);
  const pPct = completionRatio(partnerTodos.length, pDone);

  const diff = Math.abs(myDone - pDone);
  const headline =
    !partner ? "Invite your partner to begin!" :
    myDone === pDone ? "You're neck and neck today!" :
    myDone > pDone ? `You're ahead by ${diff} task${diff>1?"s":""}` :
    `${partner.display_name} is ahead by ${diff} task${diff>1?"s":""}`;

  return (
    <div className="elev px-5 py-4 flex flex-wrap items-center gap-4" style={{ background: "linear-gradient(90deg, rgba(139,124,255,0.08), rgba(67,217,163,0.08))" }}>
      <div className="h-10 w-10 rounded-full grid place-items-center bg-amber-500/20 text-amber-300"><Trophy size={18}/></div>
      <div className="flex-1 min-w-[180px]">
        <div className="font-semibold">{headline}</div>
        <div className="muted text-xs">Both of you are crushing it. Keep going!</div>
      </div>
      <div className="flex items-center gap-3">
        <ProgressRing value={myPct} size={48} stroke={5} color="#8B7CFF"
          label={<span className="text-[10px] font-semibold">{myPct}%</span>} />
        <div className="text-xs">
          <div className="font-medium">You</div>
          <div className="muted">{myDone} / {myTodos.length} tasks</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ProgressRing value={pPct} size={48} stroke={5} color="#43D9A3"
          label={<span className="text-[10px] font-semibold">{pPct}%</span>} />
        <div className="text-xs">
          <div className="font-medium">{partner?.display_name ?? "Partner"}</div>
          <div className="muted">{pDone} / {partnerTodos.length} tasks</div>
        </div>
      </div>
      <div className="relative">
        <button onClick={() => setOpen(o => !o)} className="btn btn-primary">
          👏 Send a cheer <ChevronDown size={14}/>
        </button>
        {open && (
          <div className="absolute right-0 top-11 elev p-2 flex gap-1 z-20">
            {["👏","🔥","💪","⭐","❤️"].map(e => (
              <button key={e} onClick={() => { onCheer(e); setOpen(false); }}
                className="h-9 w-9 rounded-md hover:bg-bg-elev text-lg">{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
