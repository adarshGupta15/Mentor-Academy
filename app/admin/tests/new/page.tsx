import Link from "next/link";
import { createTest } from "@/lib/tests/actions";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";

export default async function NewTestPage() {
  await requireRole("ADMIN");
  const supabase = await createClient();
  const [{ data: classes }, { data: subjects }, { data: batches }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("is_active", true).order("name"),
    supabase.from("subjects").select("id, name").eq("is_active", true).order("name"),
    supabase.from("batches").select("id, name, class_id").eq("is_active", true).order("name"),
  ]);

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>CREATE ASSESSMENT</span>
        <h2>New Test</h2>
      </div>

      <div className="form-grid">
        <form action={createTest} className="form-grid">
          <label>Title<input name="title" required /></label>
          <label>Description<textarea name="description" rows={4} /></label>
          <label>Class
            <select name="classId" required>
              <option value="">Select class</option>
              {(classes ?? []).map((item: any) => <option key={item.id} value={item.id}>Class {item.name}</option>)}
            </select>
          </label>
          <label>Subject
            <select name="subjectId" required>
              <option value="">Select subject</option>
              {(subjects ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Batch
            <select name="batchId">
              <option value="">All batches</option>
              {(batches ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Test Date<input type="date" name="testDate" required /></label>
          <label>Maximum Marks<input type="number" name="maxMarks" min={1} step={1} required /></label>
          <label>Status
            <select name="status">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>
          <div>
            <button type="submit" className="button primary">Save Test</button>
            <Link href="/admin/tests" className="button quiet">Back</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
