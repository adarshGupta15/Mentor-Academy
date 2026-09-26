"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Archive, CheckCircle2, Edit3, Eye, FilePlus2, Trash2 } from "lucide-react";
import { archiveMaterial, createMaterial, deleteMaterial, getMaterialDownloadUrl, publishMaterial, updateMaterial } from "@/lib/admin/material-actions";

type Option = { id: string; name: string };
type Material = {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  status: string;
  class_id: string;
  subject_id: string;
  chapter_id: string | null;
  original_filename: string;
  created_at: string;
  class: Option | null;
  subject: Option | null;
  chapter: Option | null;
  batches: Array<{ batch_id: string; batch: Option | null }>;
};
type ScopedOption = Option & { class_id: string; subject_id?: string };
type MaterialFormProps = {
  classes: Option[];
  subjects: Option[];
  chapters: ScopedOption[];
  batches: Array<Option & { class_id: string }>;
  material?: Material | null;
  onClose: () => void;
};
type MaterialManagerProps = {
  materials: Material[];
  classes: Option[];
  subjects: Option[];
  chapters: ScopedOption[];
  batches: Array<Option & { class_id: string }>;
};

const types = ["PDF_NOTE", "PDF_WORKSHEET", "QUESTION_PAPER", "ASSIGNMENT", "IMAGE", "OTHER"];
const label = (value: string) => value.replaceAll("_", " ");
const date = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  return (
    <>
      {error && <div className="alert-box alert-error" role="alert"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="alert-box alert-success" role="status"><CheckCircle2 size={16} /> {success}</div>}
    </>
  );
}

export function MaterialForm({ classes, subjects, chapters, batches, material, onClose }: MaterialFormProps) {
  const [classId, setClassId] = useState(material?.class_id ?? "");
  const [subjectId, setSubjectId] = useState(material?.subject_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const subjectOptions = classId ? subjects : [];
  const chapterOptions = chapters.filter((item) => item.class_id === classId && item.subject_id === subjectId);
  const batchOptions = batches.filter((item) => item.class_id === classId);
  function submit(form: FormData) { setError(null); form.set("classId", classId); form.set("subjectId", subjectId); if (material) form.set("materialId", material.id); startTransition(async () => { try { await (material ? updateMaterial(form) : createMaterial(form)); onClose(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to save material."); } }); }
  return <div className="material-form-panel"><Feedback error={error} success={null} /><form action={submit} className="form-grid material-form"><label>Title<input name="title" defaultValue={material?.title} maxLength={200} required disabled={pending} /></label><label>Material Type<select name="materialType" defaultValue={material?.material_type ?? "PDF_NOTE"} disabled={pending}>{types.map((type) => <option key={type}>{type}</option>)}</select></label><label>Class<select name="classId" value={classId} onChange={(event) => { setClassId(event.target.value); setSubjectId(""); }} required disabled={pending}><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>Class {item.name}</option>)}</select></label><label>Subject<select name="subjectId" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required disabled={pending || !classId}><option value="">Select subject</option>{subjectOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Chapter<select name="chapterId" defaultValue={material?.chapter_id ?? ""} disabled={pending || !subjectId}><option value="">No chapter</option>{chapterOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="material-batches-field">Target Batches<select name="batchIds" multiple defaultValue={material?.batches.map((item) => item.batch_id) ?? []} disabled={pending || !classId}>{batchOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>Leave empty for all batches.</small></label><label className="material-wide-field">Description<textarea name="description" defaultValue={material?.description ?? ""} maxLength={500} rows={4} disabled={pending} /></label><label className="material-wide-field">{material ? "Replace File (optional)" : "File"}<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required={!material} disabled={pending} /></label><div className="material-form-actions"><button type="button" className="button quiet" onClick={onClose} disabled={pending}>Cancel</button><button type="submit" className="button primary" disabled={pending}>{pending ? "Saving..." : material ? "Save Changes" : "Create Material"}</button></div></form></div>;
}

export function MaterialManager({ materials, classes, subjects, chapters, batches }: MaterialManagerProps) {
  const router = useRouter(); const [editing, setEditing] = useState<Material | null | undefined>(undefined); const [feedback, setFeedback] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  function action(fn: (form: FormData) => Promise<unknown>, material: Material, message: string) { const form = new FormData(); form.set("materialId", material.id); setError(null); setFeedback(null); startTransition(async () => { try { await fn(form); setFeedback(message); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Action failed."); } }); }
  function view(material: Material) { const form = new FormData(); form.set("materialId", material.id); startTransition(async () => { try { const url = await getMaterialDownloadUrl(form); window.open(url, "_blank", "noopener,noreferrer"); } catch (err) { setError(err instanceof Error ? err.message : "Unable to open file."); } }); }
  function remove(material: Material) { if (!window.confirm(`Delete ${material.title}? This removes its file and cannot be undone.`)) return; action(deleteMaterial, material, "Material deleted."); }
  return <>{editing !== undefined && <div className="material-modal"><div className="material-modal-card"><div className="material-modal-heading"><h2>{editing ? "Edit Material" : "Add Material"}</h2><button type="button" className="modal-close" onClick={() => setEditing(undefined)} aria-label="Close">×</button></div><MaterialForm classes={classes} subjects={subjects} chapters={chapters} batches={batches} material={editing} onClose={() => { setEditing(undefined); router.refresh(); }} /></div></div>}<Feedback error={error} success={feedback} /><div className="materials-toolbar"><h3>All Materials</h3><button type="button" className="button primary" onClick={() => setEditing(null)}><FilePlus2 size={16} /> Add Material</button></div><div className="data-table materials-table"><table><thead><tr><th>Title</th><th>Type</th><th>Class</th><th>Subject</th><th>Chapter</th><th>Target</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{materials.map((material) => <tr key={material.id}><td><b>{material.title}</b><small>{material.original_filename}</small></td><td>{label(material.material_type)}</td><td>{material.class?.name ? `Class ${material.class.name}` : "—"}</td><td>{material.subject?.name ?? "—"}</td><td>{material.chapter?.name ?? "—"}</td><td>{material.batches.length ? material.batches.map((item) => item.batch?.name).filter(Boolean).join(", ") : "All batches"}</td><td><span className={`fee-badge badge-${material.status.toLowerCase()}`}>{label(material.status)}</span></td><td>{date(material.created_at)}</td><td><div className="material-actions"><button type="button" onClick={() => view(material)} title="View" aria-label={`View ${material.title}`}><Eye size={15} /></button><button type="button" onClick={() => setEditing(material)} title="Edit" aria-label={`Edit ${material.title}`}><Edit3 size={15} /></button>{material.status !== "PUBLISHED" && <button type="button" onClick={() => action(publishMaterial, material, "Material published.")} title="Publish" aria-label={`Publish ${material.title}`}><CheckCircle2 size={15} /></button>}{material.status !== "ARCHIVED" && <button type="button" onClick={() => action(archiveMaterial, material, "Material archived.")} title="Archive" aria-label={`Archive ${material.title}`}><Archive size={15} /></button>}<button type="button" onClick={() => remove(material)} title="Delete" aria-label={`Delete ${material.title}`}><Trash2 size={15} /></button></div></td></tr>)}{!materials.length && <tr><td colSpan={9} className="empty-state"><FilePlus2 size={22} /><br />No materials have been created yet.</td></tr>}</tbody></table></div></>;
}