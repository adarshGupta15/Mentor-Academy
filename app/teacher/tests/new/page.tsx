import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { createTest } from "@/lib/tests/actions";

export default async function TeacherNewTestPage() {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user?.id).single();
  const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", profile?.id).single();

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select("class_id, subject_id, batch_id, class:classes(name), subject:subjects(name), batch:batches(name)")
    .eq("teacher_id", teacher?.id);

  async function createTestAction(formData: FormData): Promise<void> {
    "use server";
    await createTest(formData);
  }

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>NEW TEST</span>
        <h2>Create Teacher Test</h2>
      </div>

      <div className="form-grid">
        <form action={createTestAction} className="form-grid">
          <label>Title<input name="title" required /></label>
          <label>Description<textarea name="description" rows={4} /></label>
          <label>Class
            <select name="classId" required>
              <option value="">Select class</option>
              {(assignments ?? []).map((assignment: any) => (
                <option key={`${assignment.class_id}-${assignment.subject_id}-${assignment.batch_id ?? "all"}`} value={assignment.class_id}>Class {assignment.class?.name}</option>
              ))}
            </select>
          </label>
          <label>Subject
            <select name="subjectId" required>
              <option value="">Select subject</option>
              {(assignments ?? []).map((assignment: any) => (
                <option key={`${assignment.subject_id}-${assignment.class_id}`} value={assignment.subject_id}>{assignment.subject?.name}</option>
              ))}
            </select>
          </label>
          <label>Batch
            <select name="batchId">
              <option value="">All batches</option>
              {(assignments ?? []).map((assignment: any) => assignment.batch_id && (
                <option key={`${assignment.batch_id}-${assignment.subject_id}`} value={assignment.batch_id}>{assignment.batch?.name}</option>
              ))}
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
            <Link href="/teacher/tests" className="button quiet">Back</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
