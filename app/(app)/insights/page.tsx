import { createClient } from "@/lib/supabase/server";
import InsightsView from "@/components/InsightsView";
import type {
  Profile,
  RevisionEntry,
  StudySession,
  StudyTopic,
  Subject,
  Subtopic,
  Todo,
  WeeklyStudyRow,
} from "@/lib/types";

export default async function InsightsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("duo_members")
    .select("duo_id")
    .eq("user_id", user!.id)
    .eq("active", true)
    .single();
  const duoId = member!.duo_id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();
  const tz = profile?.timezone ?? "UTC";

  const [
    { data: todos },
    { data: profiles },
    { data: members },
    { data: subjects },
    { data: topics },
    { data: subtopics },
    { data: history },
    { data: weekly },
    { data: sessions },
  ] = await Promise.all([
    supabase.from("todos").select("*").eq("duo_id", duoId),
    supabase.from("profiles").select("*"),
    supabase.from("duo_members").select("user_id").eq("duo_id", duoId).eq("active", true),
    supabase.from("subjects").select("*").eq("user_id", user!.id).order("position"),
    supabase.from("topics").select("*").order("position"),
    supabase.from("subtopics").select("*").order("position"),
    supabase
      .from("revision_history")
      .select("*")
      .order("revised_at", { ascending: false })
      .limit(300),
    supabase.rpc("get_duo_weekly_study"),
    supabase.from("study_sessions").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  return (
    <InsightsView
      meId={user!.id}
      tz={tz}
      profiles={(profiles ?? []) as Profile[]}
      todos={(todos ?? []) as Todo[]}
      members={(members ?? []) as { user_id: string }[]}
      subjects={(subjects ?? []) as Subject[]}
      topics={(topics ?? []) as StudyTopic[]}
      subtopics={(subtopics ?? []) as Subtopic[]}
      history={(history ?? []) as RevisionEntry[]}
      weeklyRows={(weekly ?? []) as WeeklyStudyRow[]}
      sessions={(sessions ?? []) as StudySession[]}
    />
  );
}