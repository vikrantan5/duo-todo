"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Todo, DailyTarget, UserStats, DuoMember } from "@/lib/types";
import UserPanel from "./UserPanel";
import AccountabilityBanner from "./AccountabilityBanner";
import LeaderCard from "./LeaderCard";
import WeeklyChart from "./WeeklyChart";
import Achievements from "./Achievements";
import HeatmapRow from "./Heatmap";
import { todayKey } from "@/lib/utils";
import { Activity } from "lucide-react";
import { toast } from "sonner";

type Props = {
  meId: string; duoId: string;
  members: Pick<DuoMember,"user_id"|"role">[];
  profiles: Profile[];
  initialTodos: Todo[];
  initialTargets: DailyTarget[];
  initialStats: UserStats[];
};

export default function TodayBoard(p: Props) {
  const [todos, setTodos] = useState<Todo[]>(p.initialTodos);
  const [targets, setTargets] = useState<DailyTarget[]>(p.initialTargets);
  const [stats, setStats] = useState<UserStats[]>(p.initialStats);
  const [connected, setConnected] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const dateKey = todayKey(p.profiles.find(x => x.id === p.meId)?.timezone || "UTC");


  
  // router.refresh() updates the server props without remounting this client
  // component. Reconcile those props so a newly accepted partner appears in
  // the existing dashboard instead of leaving the initial snapshot in place.
  useEffect(() => setTodos(p.initialTodos), [p.initialTodos]);
  useEffect(() => setTargets(p.initialTargets), [p.initialTargets]);
  useEffect(() => setStats(p.initialStats), [p.initialStats]);

  // Realtime: scoped to this duo
  useEffect(() => {
    const ch = supabase.channel(`duo:${p.duoId}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "todos", filter: `duo_id=eq.${p.duoId}` },
        (payload) => {
          setTodos(prev => {
            if (payload.eventType === "INSERT") return [...prev.filter(t => t.id !== (payload.new as Todo).id), payload.new as Todo];
            if (payload.eventType === "UPDATE") return prev.map(t => t.id === (payload.new as Todo).id ? (payload.new as Todo) : t);
            if (payload.eventType === "DELETE") return prev.filter(t => t.id !== (payload.old as Todo).id);
            return prev;
          });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_targets", filter: `duo_id=eq.${p.duoId}` },
        (payload) => {
          setTargets(prev => {
            const row = payload.new as DailyTarget;
            if (payload.eventType === "DELETE") return prev.filter(t => !(t.user_id === (payload.old as DailyTarget).user_id && t.date_key === (payload.old as DailyTarget).date_key));
            const without = prev.filter(t => !(t.user_id === row.user_id && t.date_key === row.date_key));
            return [...without, row];
          });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions", filter: `duo_id=eq.${p.duoId}` },
        (payload) => {
          const r = payload.new as any;
          if (payload.eventType === "INSERT" && r.to_user_id === p.meId) {
            toast(`${r.emoji} Your partner sent you a cheer${r.message ? ": " + r.message : "!"}`);
          }
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_stats" },
        (payload) => {
          const row = payload.new as UserStats;
          setStats(prev => [...prev.filter(s => s.user_id !== row.user_id), row]);
        })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => { supabase.removeChannel(ch); };
  }, [p.duoId, p.meId, supabase]);

  const myId = p.meId;
  const partnerId = p.members.map(m => m.user_id).find(id => id !== myId);

  const todayTodos = (uid?: string) => todos.filter(t => t.date_key === dateKey && (uid ? t.owner_id === uid : true));
  const target = (uid: string) =>
    targets.find(t => t.user_id === uid && t.date_key === dateKey)?.target_percentage ?? 70;
  const prof = (uid?: string) => p.profiles.find(x => x.id === uid);
  const stat = (uid?: string) => stats.find(s => s.user_id === uid);

  async function sendCheer(toUserId: string, emoji: string) {
    const { error } = await supabase.from("reactions").insert({
      duo_id: p.duoId, from_user_id: myId, to_user_id: toUserId, emoji, date_key: dateKey
    });
    if (error) return toast.error(error.message);
    toast.success(`${emoji} Cheer sent!`);
  }

  return (
    <div className="space-y-6">
      <AccountabilityBanner
        me={prof(myId)!}
        partner={prof(partnerId)}
        myTodos={todayTodos(myId)}
        partnerTodos={todayTodos(partnerId)}
        onCheer={(e) => partnerId && sendCheer(partnerId, e)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-5 items-stretch">
        <UserPanel
          dateKey={dateKey}
          duoId={p.duoId}
          me
          profile={prof(myId)!}
          todos={todayTodos(myId)}
          target={target(myId)}
          stats={stat(myId)}
          accent="#8B7CFF"
          supabase={supabase}
        />
        <div className="flex flex-col items-center justify-center gap-2 muted">
          <div className="h-full w-px bg-ink-border relative">
            <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-bg px-2 py-1 text-[10px] tracking-widest border border-ink-border rounded-full">TOGETHER</span>
          </div>
          <span className="muted text-xs flex items-center gap-1">
            <Activity size={12} className={connected ? "text-brand-emerald animate-pulse2" : "text-ink-muted"} />
            {connected ? "Live" : "Offline"}
          </span>
        </div>
        <UserPanel
          dateKey={dateKey}
          duoId={p.duoId}
          profile={prof(partnerId) ?? { id: "", display_name: "Invite partner", avatar_url: null, accent_color: "#43D9A3", timezone: "UTC", theme_preference: "dark", created_at: "", updated_at: "" }}
          todos={todayTodos(partnerId)}
          target={partnerId ? target(partnerId) : 70}
          stats={stat(partnerId)}
          accent="#43D9A3"
          supabase={supabase}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <LeaderCard me={prof(myId)!} partner={prof(partnerId)} myTodos={todayTodos(myId)} partnerTodos={todayTodos(partnerId)} />
        <WeeklyChart todos={todos} meId={myId} partnerId={partnerId} profiles={p.profiles} />
        <Achievements />
        <HeatmapRow todos={todos} meId={myId} partnerId={partnerId} profiles={p.profiles} />
      </div>
    </div>
  );
}
