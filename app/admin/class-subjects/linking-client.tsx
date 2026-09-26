"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Link2, Trash2 } from "lucide-react";
import { assignSubjectToClass, removeSubjectFromClass } from "@/lib/admin/actions";

type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; is_active: boolean };
type Assignment = { class_id: string; subject_id: string; subject: SubjectOption | null };

export function LinkingClient({
  classes,
  subjects,
  assignments,
}: {
  classes: ClassOption[];
  subjects: SubjectOption[];
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const assigned = assignments.filter((item) => item.class_id === classId && item.subject).map((item) => item.subject as SubjectOption);
  const assignedIds = new Set(assigned.map((subject) => subject.id));
  const available = subjects.filter((subject) => !assignedIds.has(subject.id) && subject.is_active);

  function runAction(action: (form: FormData) => Promise<void>, form: FormData, message: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await action(form);
        setSuccess(message);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update subject assignments.");
      }
    });
  }

  function assign(subjectId: string) {
    const form = new FormData();
    form.set("classId", classId);
    form.set("subjectId", subjectId);
    runAction(assignSubjectToClass, form, "Subject assigned successfully.");
  }

  function remove(subjectId: string) {
    const form = new FormData();
    form.set("classId", classId);
    form.set("subjectId", subjectId);
    runAction(removeSubjectFromClass, form, "Subject removed successfully.");
  }

  return (
    <>
      {error && <div className="alert-box alert-error" role="alert" style={{ display: "flex", gap: "8px", alignItems: "center" }}><AlertCircle size={16} /><span>{error}</span></div>}
      {success && <div className="alert-box alert-success" role="status" style={{ display: "flex", gap: "8px", alignItems: "center" }}><CheckCircle2 size={16} /><span>{success}</span></div>}

      <div className="linking-selector">
        <label>
          Class
          <select value={classId} onChange={(event) => { setClassId(event.target.value); setError(null); setSuccess(null); }} disabled={isPending}>
            <option value="">Select class</option>
            {classes.map((item) => <option key={item.id} value={item.id}>Class {item.name}</option>)}
          </select>
        </label>
      </div>

      {classId && (
        <div className="linking-grid">
          <section className="linking-panel">
            <div className="linking-panel-heading"><h3>Assigned Subjects</h3><span>{assigned.length}</span></div>
            {assigned.length ? assigned.map((subject) => (
              <div className="linking-row" key={subject.id}>
                <span>{subject.name}</span>
                <button type="button" className="table-action-btn" onClick={() => remove(subject.id)} disabled={isPending}><Trash2 size={14} />Remove</button>
              </div>
            )) : <p className="empty-state">No subjects assigned to this class yet.</p>}
          </section>
          <section className="linking-panel">
            <div className="linking-panel-heading"><h3>Available Subjects</h3><span>{available.length}</span></div>
            {available.length ? available.map((subject) => (
              <div className="linking-row" key={subject.id}>
                <span>{subject.name}</span>
                <button type="button" className="table-action-btn" onClick={() => assign(subject.id)} disabled={isPending}><Link2 size={14} />Assign</button>
              </div>
            )) : <p className="empty-state">All active subjects are assigned.</p>}
          </section>
        </div>
      )}
    </>
  );
}