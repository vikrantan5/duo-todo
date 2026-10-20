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
