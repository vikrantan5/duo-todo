import { requireActiveDuo } from "@/lib/duo";
import RevisionsView from "@/components/study/RevisionsView";
import type { RevisionEntry, Subject, StudyTopic, Subtopic } from "@/lib/types";

export default async function RevisionsPage() {
  const { supabase, user } = await requireActiveDuo();
  const [{ data: subjects }, { data: topics }, { data: subtopics }, { data: history }, { data: profile }] =
    await Promise.all([
      supabase.from("subjects").select("*").eq("user_id", user.id).order("position"),
      supabase.from("topics").select("*").order("position"),
      supabase.from("subtopics").select("*").order("position"),
      supabase
        .from("revision_history")
        .select("*")
        .order("revised_at", { ascending: false })
        .limit(300),
      supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    ]);

  return (
    <RevisionsView
      meId={user.id}
      tz={profile?.timezone ?? "UTC"}
      subjects={(subjects ?? []) as Subject[]}
      topics={(topics ?? []) as StudyTopic[]}
      subtopics={(subtopics ?? []) as Subtopic[]}
      history={(history ?? []) as RevisionEntry[]}
    />
  );
}
