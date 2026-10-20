import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireActiveDuo() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member, error } = await supabase
    .from("duo_members")
    .select("duo_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Unable to load active duo membership", error);
    redirect("/onboarding");
  }

  if (!member) redirect("/onboarding");

  return { supabase, user, duoId: member.duo_id };
}