import { requireActiveDuo } from "@/lib/duo";
import TogetherView from "@/components/study/TogetherView";
import type { Profile, StudyOverviewRow } from "@/lib/types";

export default async function TogetherPage() {
  const { supabase, user, duoId } = await requireActiveDuo();
  const [{ data: rows }, { data: members }, { data: profiles }] = await Promise.all([
    supabase.rpc("get_duo_study_overview"),
    supabase.from("duo_members").select("user_id").eq("duo_id", duoId).eq("active", true),
    supabase.from("profiles").select("*"),
  ]);

  return (
    <TogetherView
      meId={user.id}
      duoId={duoId}
      members={(members ?? []) as { user_id: string }[]}
      profiles={(profiles ?? []) as Profile[]}
      rows={(rows ?? []) as StudyOverviewRow[]}
    />
  );
}
