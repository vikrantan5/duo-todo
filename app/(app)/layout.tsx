import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";
import DuoSync from "@/components/DuoSync";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("duo_members").select("duo_id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!member) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <DuoSync duoId={member.duo_id} userId={user.id} />
      <TopNav />
      <div className="max-w-[1480px] mx-auto px-5 py-6">{children}</div>
    </div>
  );
}
