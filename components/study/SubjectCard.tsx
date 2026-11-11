"use client";
import { useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { StudyTopic, Subtopic } from "@/lib/types";
import { subjectProgress, topicState, type TopicState } from "@/lib/study";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { ProgressBar } from "./badges";
import SubtopicRow from "./SubtopicRow";
import { ProgressRing } from "../ProgressRing";

export type TopicGroup = { topic: StudyTopic; subs: Subtopic[] };

type Props = {
  subject: { id: string; name: string; color: string; target_date: string | null };
  groups: TopicGroup[];
  progress: { studied: number; total: number; pct: number };
  topicCount: number;
  today: string;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTopic: (subjectId: string, title: string) => Promise<void> | void;
  onDeleteTopic: (topicId: string) => void;
  onAddSubtopic: (topicId: string, title: string) => Promise<void> | void;
  onEditSubtopic: (s: Subtopic) => void;
  onComplete: (s: Subtopic) => Promise<void> | void;
};

const STATE_CHIP: Record<TopicState, { label: string; color: string }> = {
  completed: { label: "Completed", color: "#43D9A3" },
  in_progress: { label: "In progress", color: "#8B7CFF" },
  not_started: { label: "Not started", color: "#9199AA" },
};

export default function SubjectCard(p: Props) {
  const target = p.subject.target_date;
  const daysLeft = target ? differenceInCalendarDays(parseISO(target), parseISO(p.today)) : null;
  const over = daysLeft !== null && daysLeft < 0;

  return (
    <div className="card p-5 animate-fade-up" data-testid="subject-card">
      <div className="flex items-center gap-3">
        <button
          onClick={p.onToggle}
          data-testid="subject-toggle-button"
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <span className="h-3 w-3 rounded-full shrink-0" style={{ background: p.subject.color }} />
          <span className="font-semibold truncate">{p.subject.name}</span>
          {target && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap"
              style={
                over
                  ? { background: "rgba(255,107,122,0.12)", color: "#FF8A96", border: "1px solid rgba(255,107,122,0.4)" }
                  : { background: "rgba(246,189,96,0.12)", color: "#FFD37A", border: "1px solid rgba(246,189,96,0.4)" }
              }
            >
              Target {format(parseISO(target), "MMM d")}
              {daysLeft !== null && (over ? ` · ${-daysLeft}d over` : ` · ${daysLeft}d left`)}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`muted transition-transform duration-200 ${p.expanded ? "" : "-rotate-90"}`}
          />
        </button>
        <div className="hidden sm:block" data-testid="subject-progress-ring">
          <ProgressRing value={p.progress.pct} size={48} stroke={5} color={p.subject.color} />
        </div>
        <div className="w-36 hidden md:block">
          <div className="flex justify-between text-xs muted mb-1">
            <span>
              {p.progress.studied}/{p.progress.total} studied
            </span>
            <span>{p.progress.pct}%</span>
          </div>
          <ProgressBar pct={p.progress.pct} color={p.subject.color} height={5} />
        </div>
        <button onClick={p.onEdit} className="btn btn-ghost !p-2" data-testid="subject-edit-button" title="Edit subject">
          <Pencil size={14} />
        </button>
        <button onClick={p.onDelete} className="btn btn-ghost !p-2" data-testid="subject-delete-button" title="Delete subject">
          <Trash2 size={14} className="text-state-danger" />
        </button>
      </div>

      {p.expanded && (
        <div className="mt-4 space-y-5 border-t hairline pt-4">
          <div className="muted text-xs">
            {p.topicCount} topic{p.topicCount === 1 ? "" : "s"}
          </div>
          {p.groups.map((g) => (
            <TopicBlock
              key={g.topic.id}
              group={g}
              today={p.today}
              onDeleteTopic={p.onDeleteTopic}
              onAddSubtopic={p.onAddSubtopic}
              onEditSubtopic={p.onEditSubtopic}
              onComplete={p.onComplete}
            />
          ))}
          {p.groups.length === 0 && (
            <div className="elev p-3 text-xs muted">No topics yet — add the first one below.</div>
          )}
          <AddTopicInline subjectId={p.subject.id} onAdd={p.onAddTopic} />
        </div>
      )}
    </div>
  );
}

function TopicBlock({
  group,
  today,
  onDeleteTopic,
  onAddSubtopic,
  onEditSubtopic,
  onComplete,
}: {
  group: TopicGroup;
  today: string;
  onDeleteTopic: (id: string) => void;
  onAddSubtopic: (topicId: string, title: string) => Promise<void> | void;
  onEditSubtopic: (s: Subtopic) => void;
  onComplete: (s: Subtopic) => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const chip = STATE_CHIP[topicState(group.subs)];

  async function add() {
    if (!title.trim()) return;
    await onAddSubtopic(group.topic.id, title.trim());
    setTitle("");
  }

  return (
    <div data-testid="topic-group">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-medium text-sm">{group.topic.title}</span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px]"
          style={{ background: `${chip.color}1A`, color: chip.color, border: `1px solid ${chip.color}44` }}
        >
          {chip.label}
        </span>
        <span className="muted text-xs">{group.subs.length} subtopics</span>
        <button
          className="btn btn-ghost !px-2 !py-1 text-xs ml-auto"
          onClick={() => setAdding((v) => !v)}
          data-testid="topic-add-subtopic-button"
        >
          <Plus size={12} /> Add Subtopic
        </button>
        <button
          className="btn btn-ghost !p-1.5"
          onClick={() => onDeleteTopic(group.topic.id)}
          data-testid="topic-delete-button"
          title="Delete topic"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {adding && (
        <input
          className="input mb-2"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder="Subtopic name, Enter to add…"
          data-testid="topic-add-subtopic-input"
        />
      )}
      {group.subs.length === 0 ? (
        <div className="elev p-3 text-xs muted">No subtopics yet — add the first one.</div>
      ) : (
        <div className="space-y-2">
          {group.subs.map((s) => (
            <SubtopicRow key={s.id} subtopic={s} today={today} onComplete={onComplete} onEdit={onEditSubtopic} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddTopicInline({
  subjectId,
  onAdd,
}: {
  subjectId: string;
  onAdd: (subjectId: string, title: string) => Promise<void> | void;
}) {
  const [title, setTitle] = useState("");

  async function add() {
    if (!title.trim()) return;
    await onAdd(subjectId, title.trim());
    setTitle("");
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void add();
        }}
        placeholder="+ Add topic — e.g. Process Management (Enter)"
        data-testid="subject-add-topic-input"
      />
      <button className="btn btn-ghost" onClick={() => void add()} data-testid="subject-add-topic-button">
        <Plus size={14} /> Add Topic
      </button>
    </div>
  );
}
