"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Megaphone } from "lucide-react";
import { createNotice, setNoticePublished } from "@/lib/admin/actions";

type Notice = {
  id: string;
  title: string;
  description: string;
  audience: "ALL" | "STUDENTS" | "TEACHERS" | "PARENTS";
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

const audienceLabels: Record<Notice["audience"], string> = {
  ALL: "Everyone",
  STUDENTS: "Students",
  TEACHERS: "Teachers",
  PARENTS: "Parents",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  return (
    <>
      {error && <div className="alert-box alert-error" role="alert" style={{ display: "flex", gap: "8px", alignItems: "center" }}><AlertCircle size={16} /><span>{error}</span></div>}
      {success && <div className="alert-box alert-success" role="status" style={{ display: "flex", gap: "8px", alignItems: "center" }}><CheckCircle2 size={16} /><span>{success}</span></div>}
    </>
  );
}

export function NoticeForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<Notice["audience"]>("ALL");
  const [published, setPublished] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await createNotice(formData);
        setTitle("");
        setDescription("");
        setAudience("ALL");
        setPublished(false);
        setPublishDate("");
        setSuccess("Notice created successfully.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create notice.");
      }
    });
  }

  return (
    <>
      <Feedback error={error} success={success} />
      <form action={handleSubmit} className="form-grid notice-form">
        <label>Title<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required disabled={isPending} /></label>
        <label>Audience<select name="audience" value={audience} onChange={(event) => setAudience(event.target.value as Notice["audience"])} disabled={isPending}><option value="ALL">Everyone</option><option value="STUDENTS">Students</option><option value="TEACHERS">Teachers</option><option value="PARENTS">Parents</option></select></label>
        <label className="notice-content-field">Content<textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} rows={5} required disabled={isPending} /></label>
        <label className="notice-publish-toggle"><input name="published" type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} disabled={isPending} /> Publish notice</label>
        <label>Publish date<input name="publishDate" type="date" value={publishDate} onChange={(event) => setPublishDate(event.target.value)} disabled={isPending || !published} /></label>
        <button type="submit" className="button primary" disabled={isPending}>{isPending ? "Creating Notice..." : "Create Notice"}</button>
      </form>
    </>
  );
}

export function NoticeList({ notices }: { notices: Notice[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleNotice(notice: Notice) {
    const formData = new FormData();
    formData.set("noticeId", notice.id);
    formData.set("published", String(!notice.is_published));
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await setNoticePublished(formData);
        setSuccess(notice.is_published ? "Notice moved to drafts." : "Notice published successfully.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update notice.");
      }
    });
  }

  return (
    <>
      <Feedback error={error} success={success} />
      <div className="data-table">
        <table>
          <thead><tr><th>Notice</th><th>Audience</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {notices.map((notice) => (
              <tr key={notice.id}>
                <td><b>{notice.title}</b><br /><small className="notice-preview">{notice.description}</small></td>
                <td>{audienceLabels[notice.audience]}</td>
                <td><span className={`fee-badge ${notice.is_published ? "badge-success" : "badge-cancelled"}`}>{notice.is_published ? "PUBLISHED" : "DRAFT"}</span></td>
                <td>{formatDate(notice.is_published ? notice.published_at : notice.created_at)}</td>
                <td><button type="button" className="table-action-btn" onClick={() => toggleNotice(notice)} disabled={isPending}>{notice.is_published ? "Unpublish" : "Publish"}</button></td>
              </tr>
            ))}
            {!notices.length && <tr><td colSpan={5} className="empty-state"><Megaphone size={22} /><br />No notices have been created yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}