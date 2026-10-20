"use client";
import type { Todo } from "@/lib/types";
import { Clock, MoreHorizontal, Check } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";

const PRIORITY_COLOR: Record<string,string> = { low: "#45D483", medium: "#F6BD60", high: "#FF6B7A" };

export default function TaskItem({ todo, canEdit, accent, supabase }: { todo: Todo; canEdit: boolean; accent: string; supabase: SupabaseClient }) {
  async function toggle() {
    if (!canEdit) return;
    const next = !todo.is_completed;
    const { error } = await supabase.from("todos")
      .update({ is_completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", todo.id);
    if (error) return toast.error(error.message);
    if (next) await supabase.rpc("award_xp_for_todo", { _todo: todo.id });
  }

  async function remove() {
    if (!canEdit) return;
    const { error } = await supabase.from("todos").delete().eq("id", todo.id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="elev p-3 flex items-center gap-3 group transition">
      <button onClick={toggle}
        aria-label="toggle complete"
        className={`h-5 w-5 rounded-md grid place-items-center border transition ${todo.is_completed ? "" : "hover:border-ink/40"}`}
        style={{ background: todo.is_completed ? accent : "transparent", borderColor: todo.is_completed ? accent : "var(--border)" }}>
        {todo.is_completed && <Check size={13} className="text-[#0B0D12]" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${todo.is_completed ? "line-through opacity-60" : ""}`}>{todo.title}</div>
        {todo.note && <div className="text-xs muted truncate">{todo.note}</div>}
      </div>
      {todo.category && <span className="text-[10px] px-2 py-0.5 rounded-full border border-ink-border muted hidden sm:inline">{todo.category}</span>}
      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${PRIORITY_COLOR[todo.priority]}22`, color: PRIORITY_COLOR[todo.priority] }}>
        {todo.priority}
      </span>
      {todo.due_time && <span className="text-[10px] muted hidden md:inline flex items-center gap-1"><Clock size={11}/>{todo.due_time.slice(0,5)}</span>}
      {todo.duration_minutes && <span className="text-[10px] muted hidden md:inline">{todo.duration_minutes}m</span>}
      {canEdit && (
        <button onClick={remove} className="muted hover:text-ink-DEFAULT transition opacity-0 group-hover:opacity-100">
          <MoreHorizontal size={14} />
        </button>
      )}
    </div>
  );
}
