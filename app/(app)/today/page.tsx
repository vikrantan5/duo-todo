import { requireActiveDuo } from "@/lib/duo";
import TodayBoard from "@/components/TodayBoard";

export default async function TodayPage() {
  const { supabase, user, duoId } = await requireActiveDuo();
  const [
    { data: members },
    { data: profiles },
    { data: todos },
    { data: targets },
    { data: stats },
  ] = await Promise.all([
    supabase.from("duo_members").select("user_id,role").eq("duo_id", duoId).eq("active", true),
    supabase.from("profiles").select("*"),
    supabase.from("todos").select("*").eq("duo_id", duoId).order("position", { ascending: true }),
    supabase.from("daily_targets").select("*").eq("duo_id", duoId),
    supabase.from("user_stats").select("*"),
  ]);

  return (
    <TodayBoard
      meId={user.id}
      duoId={duoId}
      members={members ?? []}
      profiles={profiles ?? []}
      initialTodos={todos ?? []}
      initialTargets={targets ?? []}
      initialStats={stats ?? []}
    />
  );
}