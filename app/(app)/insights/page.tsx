import { createClient } from "@/lib/supabase/server";
import InsightsView from "@/components/InsightsView";

export default async function InsightsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("duo_members").select("duo_id").eq("user_id", user!.id).eq("active", true).single();
  const duoId = member!.duo_id;
  const { data: todos } = await supabase.from("todos").select("*").eq("duo_id", duoId);
  const { data: profiles } = await supabase.from("profiles").select("*");
  const { data: members } = await supabase.from("duo_members").select("user_id").eq("duo_id", duoId).eq("active", true);
  return <InsightsView meId={user!.id} profiles={profiles ?? []} todos={todos ?? []} members={members ?? []} />;
}
