import { requireActiveDuo } from "@/lib/duo";
import TodayBoard from "@/components/TodayBoard";
import type { RevisionEntry, StudyTopic, Subject, Subtopic } from "@/lib/types";

export default async function TodayPage() {
  const { supabase, user, duoId } = await requireActiveDuo();
  const [
    { data: members },
    { data: profiles },
    { data: todos },
    { data: targets },
    { data: stats },
    { data: subjects },
    { data: topics },
    { data: subtopics },
    { data: studyHistory },
  ] = await Promise.all([
    supabase.from("duo_members").select("user_id,role").eq("duo_id", duoId).eq("active", true),
    supabase.from("profiles").select("*"),
    supabase.from("todos").select("*").eq("duo_id", duoId).order("position", { ascending: true }),
    supabase.from("daily_targets").select("*").eq("duo_id", duoId),
    supabase.from("user_stats").select("*"),
    supabase.from("subjects").select("*").eq("user_id", user.id).order("position"),
    supabase.from("topics").select("*").order("position"),
    supabase.from("subtopics").select("*").order("position"),
    supabase
      .from("revision_history")
      .select("*")
      .order("revised_at", { ascending: false })
      .limit(300),
  ]);

  return (
    <TodayBoard
      meId={user.id}
      duoId={duoId}
      members={members ?? []}
      profiles={profiles ?? []}
      initialTodos={todos ?? []}
      initialTargets={targets ?? []}
      initialStats={stats ?? []}
      initialSubjects={(subjects ?? []) as Subject[]}
      initialTopics={(topics ?? []) as StudyTopic[]}
      initialSubtopics={(subtopics ?? []) as Subtopic[]}
      studyHistory={(studyHistory ?? []) as RevisionEntry[]}
    />
  );
}
