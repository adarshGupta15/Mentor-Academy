import Link from "next/link";
import { getTeacherPortalData, matchesTeacherAssignment } from "@/lib/teacher/data";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";

export default async function TeacherMarksPage() {
  await requireRole("TEACHER");
  const { assignments, error } = await getTeacherPortalData();
  const supabase = await createClient();

  const { data: tests } = await supabase
    .from("tests")
    .select(`
      id,
      title,
      class_id,
      subject_id,
      batch_id,
      class:classes(name),
      subject:subjects(name),
      batch:batches(name),
      max_marks,
      test_date,
      status
    `)
    .order("test_date", { ascending: false });

  const visibleTests = (tests ?? []).filter((test: any) => matchesTeacherAssignment({ class_id: test.class_id, subject_id: test.subject_id, batch_id: test.batch_id }, assignments));

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>MARK ENTRY</span>
        <h2>Teacher Marks</h2>
      </div>
      {error && <div className="alert-box alert-error" role="alert">{error}</div>}
      <div className="quick-actions">
        <Link href="/teacher/tests" className="button quiet">Manage Tests</Link>
      </div>
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Batch</th>
              <th>Date</th>
              <th>Max</th>
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
                <td><Link href={`/teacher/tests/${test.id}/results`} className="button primary">Entry</Link></td>
              </tr>
            ))}
            {!visibleTests.length && <tr><td colSpan={7} className="empty-state">No tests available for marks entry in your scope.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
