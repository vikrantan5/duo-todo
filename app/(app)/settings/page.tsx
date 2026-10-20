import { requireActiveDuo } from "@/lib/duo";
import SettingsView from "@/components/SettingsView";

export default async function SettingsPage() {
  const { supabase, user, duoId } = await requireActiveDuo();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return null;
  return <SettingsView profile={profile} duoId={duoId} />;
}