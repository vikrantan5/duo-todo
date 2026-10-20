import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("duo_members").select("duo_id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!member) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="max-w-[1480px] mx-auto px-5 py-6">{children}</div>
    </div>
  );
}
