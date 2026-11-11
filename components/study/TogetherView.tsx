"use client";
import { useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, StudyOverviewRow } from "@/lib/types";
import { todayKey } from "@/lib/utils";
import { toast } from "sonner";
import { Swords, Users } from "lucide-react";
import { ProgressBar } from "./badges";

type Props = {
  meId: string;
  duoId: string;
  members: { user_id: string }[];
  profiles: Profile[];
  rows: StudyOverviewRow[];
};

export default function TogetherView(p: Props) {
  const supabase = useMemo(() => createClient(), []);
  const partnerId = p.members.map((m) => m.user_id).find((id) => id !== p.meId);
  const me = p.profiles.find((x) => x.id === p.meId);
  const partner = p.profiles.find((x) => x.id === partnerId);
  const myRow = p.rows.find((r) => r.user_id === p.meId);
  const partnerRow = p.rows.find((r) => r.user_id === partnerId);

  const comparisons = useMemo(() => {
    const names: string[] = [];
    for (const row of [myRow, partnerRow]) {
      for (const s of row?.subjects ?? []) if (!names.includes(s.name)) names.push(s.name);
    }
    return names.map((name) => {
      const mine = myRow?.subjects.find((s) => s.name === name);
      const theirs = partnerRow?.subjects.find((s) => s.name === name);
      return { name, color: mine?.color ?? theirs?.color ?? "#8B7CFF", mine: mine ?? null, theirs: theirs ?? null };
    });
  }, [myRow, partnerRow]);

  const delta = myRow && partnerRow ? myRow.study_completion - partnerRow.study_completion : null;

  async function nudge() {
    if (!partnerId) return;
    const { error } = await supabase.from("reactions").insert({
      duo_id: p.duoId,
      from_user_id: p.meId,
      to_user_id: partnerId,
      emoji: "🔥",
      message: "Time to revise!",
      date_key: todayKey(),
    });
    if (error) return toast.error(error.message);
    toast.success("Nudge sent 🔥");
  }

  if (!partnerId || !partner) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-2xl">Study Together</h1>
        <div className="card p-10 text-center" data-testid="together-no-partner">
          <Users size={28} className="mx-auto mb-3 muted" />
          <p className="font-display text-lg">Your duo is waiting for a partner</p>
          <p className="muted text-sm mt-1 max-w-md mx-auto">
            Share the invite link from Settings — once your partner joins, subject-wise study comparison appears here.
            Each of you keeps a completely different syllabus.
          </p>
          <Link href="/settings" className="btn btn-primary mt-4">
            Open Settings
          </Link>
        </div>
      </div>
    );
  }

  const bothRevisedToday = (myRow?.revisions_today ?? 0) > 0 && (partnerRow?.revisions_today ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl flex items-center gap-2">
          <Swords size={20} className="text-brand-violet" /> Study Together
        </h1>
        <button className="btn btn-ghost text-xs" onClick={() => void nudge()} data-testid="partner-nudge-btn">
          🔥 Nudge partner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 items-stretch" data-testid="duo-faceoff-card">
        <FaceCard
          name={me?.display_name || "You"}
          pct={myRow?.study_completion ?? 0}
          color="#8B7CFF"
          caption={`${myRow?.total_revisions ?? 0} total revisions · ${myRow?.revisions_today ?? 0} today`}
        />
        <div className="grid place-items-center">
          <span
            className="px-3 py-1.5 rounded-full text-xs border"
            style={
              delta === null
                ? { borderColor: "#272D3A", color: "#9199AA" }
                : delta === 0
                  ? { borderColor: "#272D3A", color: "#9199AA" }
                  : delta > 0
                    ? { borderColor: "rgba(139,124,255,0.5)", color: "#8B7CFF" }
                    : { borderColor: "rgba(67,217,163,0.5)", color: "#43D9A3" }
            }
            data-testid="duo-delta-pill"
          >
            {delta === null ? "—" : delta === 0 ? "Tied" : delta > 0 ? `+${delta}% ahead` : `+${-delta}% behind`}
          </span>
        </div>
        <FaceCard
          name={partner.display_name || "Partner"}
          pct={partnerRow?.study_completion ?? 0}
          color="#43D9A3"
          caption={`${partnerRow?.total_revisions ?? 0} total revisions · ${partnerRow?.revisions_today ?? 0} today`}
        />
      </div>

      {bothRevisedToday && (
        <div className="elev p-3 text-sm text-center" data-testid="duo-streak-challenge">
          🔥 Duo boost — you both revised today!
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">Subject comparison</div>
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
        {comparisons.length === 0 ? (
          <div className="elev p-4 text-sm muted">No subjects yet — add subjects to compare progress.</div>
        ) : (
          <div className="space-y-5" data-testid="subject-comparison-list">
            {comparisons.map((c) => (
              <div key={c.name} data-testid="subject-comparison-row">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[11px] muted ml-auto">
                    {c.mine ? `${c.mine.studied}/${c.mine.total}` : "—"} · {c.theirs ? `${c.theirs.studied}/${c.theirs.total}` : "—"} subtopics
                  </span>
                </div>
                <div className="space-y-1.5">
                  <BarRow who="You" pct={c.mine?.pct ?? 0} color="#8B7CFF" />
                  <BarRow who="Partner" pct={c.theirs?.pct ?? 0} color="#43D9A3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FaceCard({ name, pct, color, caption }: { name: string; pct: number; color: string; caption: string }) {
  return (
    <div className="card p-6 text-center animate-fade-up" style={{ boxShadow: `inset 0 0 0 1px ${color}22` }}>
      <div
        className="h-12 w-12 rounded-full grid place-items-center text-lg font-semibold mx-auto"
        style={{ background: `${color}22`, color, border: `1px solid ${color}66` }}
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="font-display text-5xl mt-3" style={{ color }}>
        {pct}%
      </div>
      <div className="text-sm muted mt-1">{name} · study completion</div>
      <div className="text-xs muted mt-1">{caption}</div>
    </div>
  );
}

function BarRow({ who, pct, color }: { who: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] muted w-14">{who}</span>
      <ProgressBar pct={pct} color={color} height={7} />
      <span className="text-xs w-10 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}
