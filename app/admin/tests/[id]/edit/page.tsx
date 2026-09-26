import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { updateTest } from "@/lib/tests/actions";

export default async function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const supabase = await createClient();
  const { data: test, error } = await supabase
    .from("tests")
    .select("id, title, description, class_id, subject_id, batch_id, test_date, max_marks, status")
    .eq("id", id)
    .single();

  if (error || !test) notFound();

  const [{ data: classes }, { data: subjects }, { data: batches }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("is_active", true).order("name"),
    supabase.from("subjects").select("id, name").eq("is_active", true).order("name"),
    supabase.from("batches").select("id, name, class_id").eq("is_active", true).order("name"),
  ]);

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>EDIT ASSESSMENT</span>
        <h2>Edit Test</h2>
      </div>

      <div className="form-grid">
        <form action={updateTest} className="form-grid">
          <input type="hidden" name="testId" value={test.id} />
          <label>Title<input name="title" defaultValue={test.title} required /></label>
          <label>Description<textarea name="description" rows={4} defaultValue={test.description ?? ""} /></label>
          <label>Class
            <select name="classId" defaultValue={test.class_id} required>
              {(classes ?? []).map((item: any) => <option key={item.id} value={item.id}>Class {item.name}</option>)}
            </select>
          </label>
          <label>Subject
            <select name="subjectId" defaultValue={test.subject_id} required>
              {(subjects ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Batch
            <select name="batchId" defaultValue={test.batch_id ?? ""}>
              <option value="">All batches</option>
              {(batches ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Test Date<input type="date" name="testDate" defaultValue={test.test_date ?? ""} required /></label>
          <label>Maximum Marks<input type="number" name="maxMarks" min={1} step={1} defaultValue={test.max_marks} required /></label>
          <label>Status
            <select name="status" defaultValue={test.status}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <div>
            <button type="submit" className="button primary">Save Changes</button>
            <Link href="/admin/tests" className="button quiet">Back</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
