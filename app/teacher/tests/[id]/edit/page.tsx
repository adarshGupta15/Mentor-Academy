import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeacherPortalData } from "@/lib/teacher/data";
import { updateTest } from "@/lib/tests/actions";

export default async function TeacherEditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { teacher, assignments } = await getTeacherPortalData();
  if (!teacher) notFound();

  const supabase = await createClient();
  const { data: test, error } = await supabase
    .from("tests")
    .select("id, created_by_teacher_id, title, description, class_id, subject_id, batch_id, test_date, max_marks, status")
    .eq("id", id)
    .single();

  if (error || !test || test.created_by_teacher_id !== teacher.id) notFound();

  async function updateTestFormAction(formData: FormData): Promise<void> {
    "use server";
    await updateTest(formData);
  }

  const validAssignments = [...new Map(assignments.map((assignment) => [
    `${assignment.class_id}:${assignment.subject_id}:${assignment.batch_id ?? "all"}`,
    assignment,
  ])).values()];
  const classes = [...new Map(validAssignments.map((assignment) => [assignment.class_id, assignment.class])).values()];
  const subjects = [...new Map(validAssignments.map((assignment) => [assignment.subject_id, assignment.subject])).values()];
  const batches = [...new Map(validAssignments.filter((assignment) => assignment.batch).map((assignment) => [assignment.batch_id as string, assignment.batch as NonNullable<typeof assignment.batch>])).values()];

  return (
    <section className="manage">
      <div className="admin-hero"><span>TEACHER TESTS</span><h2>Edit Test</h2></div>
      <div className="form-grid">
        <form action={updateTestFormAction} className="form-grid">
          <input type="hidden" name="testId" value={test.id} />
          <label>Title<input name="title" defaultValue={test.title} required /></label>
          <label>Description<textarea name="description" rows={4} defaultValue={test.description ?? ""} /></label>
          <label>Class<select name="classId" defaultValue={test.class_id} required>{classes.map((item) => <option key={item.id} value={item.id}>Class {item.name}</option>)}</select></label>
          <label>Subject<select name="subjectId" defaultValue={test.subject_id} required>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Batch<select name="batchId" defaultValue={test.batch_id ?? ""}><option value="">All batches</option>{batches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Test Date<input type="date" name="testDate" defaultValue={test.test_date} required /></label>
          <label>Maximum Marks<input type="number" name="maxMarks" min={1} step={1} defaultValue={test.max_marks} required /></label>
          <label>Status<select name="status" defaultValue={test.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
          <div><button type="submit" className="button primary">Save Changes</button><Link href="/teacher/tests" className="button quiet">Back</Link></div>
        </form>
      </div>
    </section>
  );
}