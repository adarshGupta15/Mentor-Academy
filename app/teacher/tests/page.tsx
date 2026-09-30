import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { publishTest, archiveTest, deleteTest } from "@/lib/tests/actions";
import { getTeacherPortalData, matchesTeacherAssignment } from "@/lib/teacher/data";

export default async function TeacherTestsPage() {
  await requireRole("TEACHER");
  const { teacher, assignments, error: assignmentError } = await getTeacherPortalData();
  const supabase = await createClient();
  const { data: tests, error } = await supabase
    .from("tests")
    .select(`
      id,
      created_by_teacher_id,
      title,
      description,
      status,
      test_date,
      max_marks,
      class_id,
      subject_id,
      batch_id,
      class:classes(name),
      subject:subjects(name),
      batch:batches(name)
    `)
    .order("created_at", { ascending: false });

  const visibleTests = (tests ?? []).filter((test: any) => matchesTeacherAssignment({ class_id: test.class_id, subject_id: test.subject_id, batch_id: test.batch_id }, assignments));

  async function publishTestAction(formData: FormData): Promise<void> {
    "use server";
    await publishTest(formData);
  }

  async function archiveTestAction(formData: FormData): Promise<void> {
    "use server";
    await archiveTest(formData);
  }

  async function deleteTestAction(formData: FormData): Promise<void> {
    "use server";
    await deleteTest(formData);
  }

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>TEACHER TESTS</span>
        <h2>My Tests</h2>
        <p>Review and manage tests in your assigned class and subject scope.</p>
      </div>

      {(assignmentError || error) && <div className="alert-box alert-error" role="alert">{assignmentError ?? "Unable to load your tests."}</div>}

      <div className="quick-actions" style={{ marginTop: 12 }}>
        <Link href="/teacher/tests/new" className="button primary">Create Test</Link>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Batch</th>
              <th>Date</th>
              <th>Max</th>
              <th>Status</th>
              <th>Creator</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleTests.map((test: any) => (
              <tr key={test.id}>
                <td>{test.title}</td>
                <td>{test.class?.name ? `Class ${test.class.name}` : "—"}</td>
                <td>{test.subject?.name ?? "—"}</td>
                <td>{test.batch?.name ?? "All batches"}</td>
                <td>{test.test_date}</td>
                <td>{test.max_marks}</td>
                <td><span className={`fee-badge badge-${String(test.status).toLowerCase()}`}>{test.status}</span></td>
                <td>{test.created_by_teacher_id === teacher?.id ? "You" : "Assigned teacher"}</td>
                <td>
                  <div className="material-actions">
                    <Link href={`/teacher/tests/${test.id}/results`} className="button quiet">Results</Link>
                    {test.created_by_teacher_id === teacher?.id && <>
                      <Link href={`/teacher/tests/${test.id}/edit`} className="button quiet">Edit</Link>
                      {test.status !== "PUBLISHED" && <form action={publishTestAction}><input type="hidden" name="testId" value={test.id} /><button type="submit" className="button primary">Publish</button></form>}
                      {test.status !== "ARCHIVED" && <form action={archiveTestAction}><input type="hidden" name="testId" value={test.id} /><button type="submit" className="button quiet">Archive</button></form>}
                      <form action={deleteTestAction}><input type="hidden" name="testId" value={test.id} /><button type="submit" className="button quiet">Delete</button></form>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
            {!visibleTests.length && <tr><td colSpan={9} className="empty-state">No tests in your assignment scope.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
