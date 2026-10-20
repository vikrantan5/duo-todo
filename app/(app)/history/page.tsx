import { createClient } from "@/lib/supabase/server";
import HistoryView from "@/components/HistoryView";

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase.from("duo_members").select("duo_id").eq("user_id", user!.id).eq("active", true).single();
  const duoId = member!.duo_id;

  const { data: todos } = await supabase.from("todos").select("*").eq("duo_id", duoId).order("date_key", { ascending: false });
  const { data: profiles } = await supabase.from("profiles").select("*");
  return <HistoryView meId={user!.id} profiles={profiles ?? []} todos={todos ?? []} />;
}
