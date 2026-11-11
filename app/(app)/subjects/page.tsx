import { requireActiveDuo } from "@/lib/duo";
import SubjectsView from "@/components/study/SubjectsView";
import type { Subject, StudyTopic, Subtopic } from "@/lib/types";

export default async function SubjectsPage() {
  const { supabase, user } = await requireActiveDuo();
  const [{ data: subjects }, { data: topics }, { data: subtopics }, { data: profile }] =
    await Promise.all([
      supabase.from("subjects").select("*").eq("user_id", user.id).order("position"),
      supabase.from("topics").select("*").order("position"),
      supabase.from("subtopics").select("*").order("position"),
      supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    ]);

  return (
    <SubjectsView
      meId={user.id}
      tz={profile?.timezone ?? "UTC"}
      initialSubjects={(subjects ?? []) as Subject[]}
      initialTopics={(topics ?? []) as StudyTopic[]}
      initialSubtopics={(subtopics ?? []) as Subtopic[]}
    />
  );
}
