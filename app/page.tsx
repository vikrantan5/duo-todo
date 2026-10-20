import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Index() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: member } = await supabase
      .from("duo_members").select("duo_id").eq("user_id", user.id).eq("active", true).maybeSingle();
    redirect(member ? "/today" : "/onboarding");
  }
  redirect("/login");
}
