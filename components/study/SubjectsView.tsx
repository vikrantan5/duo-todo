"use client";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Subject, StudyTopic, Subtopic } from "@/lib/types";
import { SUBJECT_COLORS, computeStats, isDue, subjectProgress } from "@/lib/study";
import { todayKey } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import Modal from "./Modal";
import SubjectCard from "./SubjectCard";
import { ProgressBar } from "./badges";

type Props = {
  meId: string;
  tz: string;
  initialSubjects: Subject[];
  initialTopics: StudyTopic[];
  initialSubtopics: Subtopic[];
};

function upsert<T extends { id: string }>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [...list, row];
  const next = list.slice();
  next[i] = row;
  return next;
}

export default function SubjectsView(p: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [subjects, setSubjects] = useState(p.initialSubjects);
  const [topics, setTopics] = useState(p.initialTopics);
  const [subtopics, setSubtopics] = useState(p.initialSubtopics);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<"all" | Subtopic["difficulty"]>("all");
  const [status, setStatus] = useState<"all" | "studied" | "not_started" | "due">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editSubtopic, setEditSubtopic] = useState<Subtopic | null>(null);
  const [expanded, setExpanded] = useState<string | null>(p.initialSubjects[0]?.id ?? null);

  useEffect(() => setSubjects(p.initialSubjects), [p.initialSubjects]);
  useEffect(() => setTopics(p.initialTopics), [p.initialTopics]);
  useEffect(() => setSubtopics(p.initialSubtopics), [p.initialSubtopics]);

  // Live sync across tabs (RLS-scoped: these events are always the owner's own rows).
  useEffect(() => {
    const apply = <T extends { id: string }>(
      setter: Dispatch<SetStateAction<T[]>>,
      payload: { eventType: string; new: unknown; old: unknown },
    ) => {
      if (payload.eventType === "DELETE") {
        const old = payload.old as { id: string };
        setter((prev) => prev.filter((x) => x.id !== old.id));
      } else {
        setter((prev) => upsert(prev, payload.new as T));
      }
    };
    const ch = supabase
      .channel(`study:${p.meId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects", filter: `user_id=eq.${p.meId}` },
        (payload) => apply(setSubjects, payload),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "topics" }, (payload) => apply(setTopics, payload))
      .on("postgres_changes", { event: "*", schema: "public", table: "subtopics" }, (payload) =>
        apply(setSubtopics, payload),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [p.meId, supabase]);

  const today = todayKey(p.tz);

  async function addSubject(name: string, color: string, targetDate: string | null): Promise<void> {
    const position = subjects.length === 0 ? 0 : Math.max(...subjects.map((s) => s.position)) + 1;
    const { data, error } = await supabase
      .from("subjects")
      .insert({ user_id: p.meId, name, color, target_date: targetDate, position })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubjects((prev) => [...prev, data as Subject]);
    setExpanded((data as Subject).id);
    toast.success("Subject created");
  }

  async function updateSubject(id: string, patch: Partial<Subject>): Promise<void> {
    const { data, error } = await supabase.from("subjects").update(patch).eq("id", id).select().single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubjects((prev) => upsert(prev, data as Subject));
    toast.success("Subject updated");
  }

  async function deleteSubject(id: string): Promise<void> {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTopics((prev) => prev.filter((t) => t.subject_id !== id));
    toast.success("Subject deleted");
  }

  async function addTopic(subjectId: string, title: string): Promise<void> {
    const sTopics = topics.filter((t) => t.subject_id === subjectId);
    const position = sTopics.length === 0 ? 0 : Math.max(...sTopics.map((t) => t.position)) + 1;
    const { data, error } = await supabase
      .from("topics")
      .insert({ subject_id: subjectId, title, position })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setTopics((prev) => [...prev, data as StudyTopic]);
  }

  async function deleteTopic(id: string): Promise<void> {
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTopics((prev) => prev.filter((t) => t.id !== id));
    setSubtopics((prev) => prev.filter((s) => s.topic_id !== id));
  }

  async function addSubtopic(topicId: string, title: string): Promise<void> {
    const tSubs = subtopics.filter((s) => s.topic_id === topicId);
    const position = tSubs.length === 0 ? 0 : Math.max(...tSubs.map((s) => s.position)) + 1;
    const { data, error } = await supabase
      .from("subtopics")
      .insert({ topic_id: topicId, title, position })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubtopics((prev) => [...prev, data as Subtopic]);
  }

  async function patchSubtopic(id: string, patch: Partial<Subtopic>): Promise<void> {
    const { data, error } = await supabase.from("subtopics").update(patch).eq("id", id).select().single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubtopics((prev) => upsert(prev, data as Subtopic));
    toast.success("Subtopic updated");
  }

  async function deleteSubtopic(id: string): Promise<void> {
    const { error } = await supabase.from("subtopics").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubtopics((prev) => prev.filter((s) => s.id !== id));
    toast.success("Subtopic deleted");
  }

  async function completeRevision(subtopic: Subtopic): Promise<void> {
    const { data, error } = await supabase.rpc("complete_revision", { _subtopic_id: subtopic.id }).single();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Could not complete revision");
      return;
    }
    const updated = data as Subtopic;
    setSubtopics((prev) => upsert(prev, updated));
    toast.success(
      subtopic.status === "not_started"
        ? `Studied! Next revision due ${updated.next_due_at ?? "soon"}`
        : `Revision ${updated.revision_count} complete — next due ${updated.next_due_at ?? "soon"}`,
    );
  }

  const stats = useMemo(() => computeStats(subtopics, topics, today), [subtopics, topics, today]);
  const activeFilters = query.trim() !== "" || difficulty !== "all" || status !== "all";

  const tree = useMemo(() => {
    const q = query.trim().toLowerCase();
      const subFiltersActive = difficulty !== "all" || status !== "all";
    return subjects
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => {
        const sTopics = topics.filter((t) => t.subject_id === s.id).sort((a, b) => a.position - b.position);
        const sSubs = subtopics.filter((x) => sTopics.some((t) => t.id === x.topic_id));
        const groups = sTopics
          .map((t) => ({
            topic: t,
            subs: subtopics
              .filter((x) => x.topic_id === t.id)
              .sort((a, b) => a.position - b.position)
              .filter((x) => difficulty === "all" || x.difficulty === difficulty)
              .filter((x) => status === "all" || (status === "due" ? isDue(x, today) : x.status === status))
              .filter(
                (x) =>
                  !q ||
                  x.title.toLowerCase().includes(q) ||
                  t.title.toLowerCase().includes(q) ||
                  s.name.toLowerCase().includes(q),
              ),
          }))
          .filter((g) => g.subs.length > 0 || (!activeFilters && g.subs.length === 0));
        return { subject: s, groups, progress: subjectProgress(sSubs) };
      })
       .filter((e) => {
        // Browsing (no filters): every subject stays visible — including one
        // with no topics yet. Its expanded card holds the "add topic" input, so
        // a fresh subject must never disappear (that deadlocked the page: no
        // card → no way to add topics → the card could never appear).
        if (!activeFilters) return true;
        if (e.groups.length > 0) return true;
        // Search-only filtering: keep a subject whose own name matches even
        // when none of its subtopics do.
        return !subFiltersActive && e.subject.name.toLowerCase().includes(q);
      });
  }, [subjects, topics, subtopics, query, difficulty, status, today, activeFilters]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">My Subjects</h1>
          <p className="muted text-sm mt-1" data-testid="subjects-summary">
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} · {stats.totalSubtopics} subtopics ·{" "}
            {stats.studyCompletion}% studied
          </p>
        </div>
        <button className="btn btn-primary" data-testid="subjects-new-button" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> New Subject
        </button>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="muted">Study completion</span>
          <span>
            {stats.studyCompletion}% · revision health {stats.revisionCompletion}%
          </span>
        </div>
        <ProgressBar pct={stats.studyCompletion} color="#8B7CFF" />
      </div>

      <div className="elev p-3 flex items-center gap-2 flex-wrap" data-testid="subject-filter-bar">
        <div className="flex items-center gap-2 flex-1 min-w-56">
          <Search size={14} className="muted" />
          <input
            className="bg-transparent outline-none text-sm w-full"
            placeholder="Search subjects, topics, subtopics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="subject-search-input"
          />
        </div>
        <select
          className="input !w-auto text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          data-testid="status-filter"
        >
          <option value="all">All status</option>
          <option value="studied">Studied</option>
          <option value="not_started">Not started</option>
          <option value="due">Revision due</option>
        </select>
        <select
          className="input !w-auto text-xs"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
          data-testid="difficulty-filter"
        >
          <option value="all">All difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {tree.length === 0 && (
        <div className="card p-10 text-center animate-fade-up" data-testid="empty-subjects-placeholder">
          <p className="font-display text-lg">{subjects.length === 0 ? "No study subjects yet" : "Nothing matches these filters"}</p>
          <p className="muted text-sm mt-1 max-w-md mx-auto">
            {subjects.length === 0
              ? "Create your first subject (e.g. Operating Systems or Organic Chemistry) to start tracking topics and revisions with your duo partner."
              : "Try a different search or clear the filters."}
          </p>
          {subjects.length === 0 && (
            <button className="btn btn-primary mt-4" onClick={() => setAddOpen(true)} data-testid="empty-create-subject-button">
              <Plus size={16} /> Create First Subject
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {tree.map(({ subject, groups, progress }) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            groups={groups}
            progress={progress}
            topicCount={topics.filter((t) => t.subject_id === subject.id).length}
            today={today}
            expanded={expanded === subject.id}
            onToggle={() => setExpanded((cur) => (cur === subject.id ? null : subject.id))}
            onEdit={() => setEditSubject(subject)}
            onDelete={() => {
              if (confirm(`Delete "${subject.name}" with all its topics?`)) void deleteSubject(subject.id);
            }}
            onAddTopic={addTopic}
            onDeleteTopic={deleteTopic}
            onAddSubtopic={addSubtopic}
            onEditSubtopic={setEditSubtopic}
            onComplete={completeRevision}
          />
        ))}
      </div>

      <AddSubjectModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (name, color, target) => {
          await addSubject(name, color, target);
          setAddOpen(false);
        }}
      />

      {editSubject && (
        <EditSubjectModal
          subject={editSubject}
          onClose={() => setEditSubject(null)}
          onSave={async (name, color, target) => {
            await updateSubject(editSubject.id, { name, color, target_date: target });
            setEditSubject(null);
          }}
          onDelete={() => {
            if (confirm(`Delete "${editSubject.name}" with all its topics?`)) {
              void deleteSubject(editSubject.id);
              setEditSubject(null);
            }
          }}
        />
      )}

      {editSubtopic && (
        <EditSubtopicModal
          subtopic={editSubtopic}
          onClose={() => setEditSubtopic(null)}
          onSave={async (patch) => {
            await patchSubtopic(editSubtopic.id, patch);
            setEditSubtopic(null);
          }}
          onDelete={() => {
            void deleteSubtopic(editSubtopic.id);
            setEditSubtopic(null);
          }}
        />
      )}
    </div>
  );
}

function AddSubjectModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string, target: string | null) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0]);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    await onSubmit(name.trim(), color, target || null);
    setBusy(false);
    setName("");
    setTarget("");
    setColor(SUBJECT_COLORS[0]);
  }

  return (
    <Modal open={open} title="New Subject" onClose={onClose} testId="add-subject-dialog">
      <label className="text-sm muted">Name</label>
      <input
        className="input mt-1 mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Operating System"
        data-testid="add-subject-name-input"
      />
      <label className="text-sm muted">Color</label>
      <div className="flex gap-2 mt-2 mb-4">
        {SUBJECT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            data-testid={`subject-color-${c.slice(1)}`}
            className="h-7 w-7 rounded-full transition-transform duration-150 active:scale-95"
            style={{ background: c, border: `2px solid ${color === c ? "#F5F7FB" : "transparent"}` }}
          />
        ))}
      </div>
      <label className="text-sm muted">Target date (optional)</label>
      <input
        type="date"
        className="input mt-1 mb-6 [color-scheme:dark]"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        data-testid="add-subject-target-input"
      />
      <button
        className="btn btn-primary w-full"
        disabled={!name.trim() || busy}
        onClick={() => void submit()}
        data-testid="add-subject-submit-button"
      >
        {busy ? "Creating…" : "Create Subject"}
      </button>
    </Modal>
  );
}

function EditSubjectModal({
  subject,
  onClose,
  onSave,
  onDelete,
}: {
  subject: Subject;
  onClose: () => void;
  onSave: (name: string, color: string, target: string | null) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(subject.name);
  const [color, setColor] = useState(subject.color);
  const [target, setTarget] = useState(subject.target_date ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <Modal open title="Edit Subject" onClose={onClose} testId="edit-subject-dialog">
      <label className="text-sm muted">Name</label>
      <input className="input mt-1 mb-4" value={name} onChange={(e) => setName(e.target.value)} data-testid="edit-subject-name-input" />
      <label className="text-sm muted">Color</label>
      <div className="flex gap-2 mt-2 mb-4">
        {SUBJECT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            data-testid={`edit-subject-color-${c.slice(1)}`}
            className="h-7 w-7 rounded-full transition-transform duration-150 active:scale-95"
            style={{ background: c, border: `2px solid ${color === c ? "#F5F7FB" : "transparent"}` }}
          />
        ))}
      </div>
      <label className="text-sm muted">Target date</label>
      <input
        type="date"
        className="input mt-1 mb-6 [color-scheme:dark]"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        data-testid="edit-subject-target-input"
      />
      <div className="flex gap-2">
        <button
          className="btn btn-ghost flex-1"
          onClick={onDelete}
          data-testid="edit-subject-delete-button"
          style={{ color: "#FF6B7A", borderColor: "rgba(255,107,122,0.4)" }}
        >
          Delete
        </button>
        <button
          className="btn btn-primary flex-1"
          disabled={!name.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await onSave(name.trim(), color, target || null);
            setBusy(false);
          }}
          data-testid="edit-subject-save-button"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function EditSubtopicModal({
  subtopic,
  onClose,
  onSave,
  onDelete,
}: {
  subtopic: Subtopic;
  onClose: () => void;
  onSave: (patch: Partial<Subtopic>) => Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(subtopic.title);
  const [difficulty, setDifficulty] = useState<Subtopic["difficulty"]>(subtopic.difficulty);
  const [notes, setNotes] = useState(subtopic.notes);
  const [resourceUrl, setResourceUrl] = useState(subtopic.resource_url ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(subtopic.title);
    setDifficulty(subtopic.difficulty);
    setNotes(subtopic.notes);
    setResourceUrl(subtopic.resource_url ?? "");
  }, [subtopic]);

  return (
    <Modal open title="Edit Subtopic" onClose={onClose} testId="edit-subtopic-dialog">
      <label className="text-sm muted">Title</label>
      <input
        className="input mt-1 mb-4"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        data-testid="edit-subtopic-title-input"
      />
      <label className="text-sm muted">Difficulty</label>
      <select
        className="input mt-1 mb-4"
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value as Subtopic["difficulty"])}
        data-testid="edit-subtopic-difficulty-select"
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
      <label className="text-sm muted">Study notes</label>
      <textarea
        className="input mt-1 mb-4 min-h-24"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes, mnemonics, formulas…"
        data-testid="edit-subtopic-notes-input"
      />
      <label className="text-sm muted">Resource link</label>
      <input
        className="input mt-1 mb-6"
        value={resourceUrl}
        onChange={(e) => setResourceUrl(e.target.value)}
        placeholder="https://… (video, notes, Anki deck)"
        data-testid="edit-subtopic-resource-input"
      />
      <div className="flex gap-2">
        <button
          className="btn btn-ghost flex-1"
          onClick={onDelete}
          data-testid="edit-subtopic-delete-button"
          style={{ color: "#FF6B7A", borderColor: "rgba(255,107,122,0.4)" }}
        >
          Delete
        </button>
        <button
          className="btn btn-primary flex-1"
          disabled={!title.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await onSave({ title: title.trim(), difficulty, notes, resource_url: resourceUrl || null });
            setBusy(false);
          }}
          data-testid="edit-subtopic-save-button"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}