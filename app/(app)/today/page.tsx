import { createClient } from "@/lib/supabase/server";
import TodayBoard from "@/components/TodayBoard";

export default async function TodayPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("duo_members").select("duo_id").eq("user_id", user!.id).eq("active", true).single();

  const duoId = member!.duo_id;

  const [{ data: members }, { data: profiles }, { data: todos }, { data: targets }, { data: stats }] =
    await Promise.all([
      supabase.from("duo_members").select("user_id,role").eq("duo_id", duoId).eq("active", true),
      supabase.from("profiles").select("*"),
      supabase.from("todos").select("*").eq("duo_id", duoId).order("position", { ascending: true }),
      supabase.from("daily_targets").select("*").eq("duo_id", duoId),
      supabase.from("user_stats").select("*"),
    ]);

  return (
    <TodayBoard
      meId={user!.id}
      duoId={duoId}
      members={members ?? []}
      profiles={profiles ?? []}
      initialTodos={todos ?? []}
      initialTargets={targets ?? []}
      initialStats={stats ?? []}
    />
  );
}
