import { createClient } from "@/lib/supabase/server";
import SettingsView from "@/components/SettingsView";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const { data: member } = await supabase.from("duo_members").select("duo_id").eq("user_id", user!.id).eq("active", true).single();
  return <SettingsView profile={profile!} duoId={member!.duo_id} />;
}
