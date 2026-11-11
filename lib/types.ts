export type UUID = string;

export type Profile = {
  id: UUID;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  timezone: string;
  theme_preference: "dark" | "light";
  created_at: string;
  updated_at: string;
};

export type Duo = {
  id: UUID;
  name: string;
  created_by: UUID;
  created_at: string;
};

export type DuoMember = {
  duo_id: UUID;
  user_id: UUID;
  role: "owner" | "member";
  joined_at: string;
  active: boolean;
};

export type Priority = "low" | "medium" | "high";

export type Todo = {
  id: UUID;
  duo_id: UUID;
  owner_id: UUID;
  title: string;
  note: string | null;
  category: string | null;
  custom_category: string | null;
  priority: Priority;
  due_time: string | null;
  duration_minutes: number | null;
  position: number;
  is_completed: boolean;
  completed_at: string | null;
  recurring_rule: Record<string, unknown> | null;
  source_todo_id: UUID | null;
  date_key: string;
  created_at: string;
  updated_at: string;
};

export type Subtask = {
  id: UUID;
  todo_id: UUID;
  title: string;
  is_completed: boolean;
  position: number;
};

export type Reaction = {
  id: UUID;
  duo_id: UUID;
  from_user_id: UUID;
  to_user_id: UUID;
  todo_id: UUID | null;
  date_key: string;
  emoji: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
};

export type DailyTarget = {
  user_id: UUID;
  duo_id: UUID;
  date_key: string;
  target_percentage: number;
};

export type UserStats = {
  user_id: UUID;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_qualifying_day: string | null;
};

export type DayReflection = {
  id: UUID;
  duo_id: UUID;
  user_id: UUID;
  date_key: string;
  reflection_text: string;
};

// ============================================================
// Study module — mirrors supabase/migrations/005_study_module.sql
// ============================================================

export type Subject = {
  id: UUID;
  user_id: UUID;
  name: string;
  color: string;
  target_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type StudyTopic = {
  id: UUID;
  subject_id: UUID;
  title: string;
  position: number;
  created_at: string;
};

export type SubtopicStatus = "not_started" | "studied";
export type Difficulty = "easy" | "medium" | "hard";

export type Subtopic = {
  id: UUID;
  topic_id: UUID;
  title: string;
  status: SubtopicStatus;
  difficulty: Difficulty;
  notes: string;
  resource_url: string | null;
  revision_count: number;
  last_revised_at: string | null;
  next_due_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

/** revision_number 0 = first study, 1..n = later revisions. */
export type RevisionEntry = {
  id: UUID;
  subtopic_id: UUID;
  user_id: UUID;
  revision_number: number;
  revised_at: string;
};

export type StudySession = {
  id: UUID;
  user_id: UUID;
  subject_id: UUID | null;
  duration_minutes: number;
  created_at: string;
};

export type SubjectProgress = {
  name: string;
  color: string;
  studied: number;
  total: number;
  pct: number;
};

/** One row per duo member — returned by the get_duo_study_overview() RPC. */
export type StudyOverviewRow = {
  user_id: UUID;
  display_name: string;
  accent_color: string;
  study_completion: number;
  revision_completion: number;
  topics_studied: number;
  total_subtopics: number;
  total_revisions: number;
  revisions_today: number;
  subjects: SubjectProgress[];
};

/** One row per (member, day) — returned by the get_duo_weekly_study() RPC. */
export type WeeklyStudyRow = {
  user_id: UUID;
  day: string;
  revisions: number;
  first_studies: number;
};
