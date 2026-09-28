import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { publishTest, archiveTest } from "@/lib/tests/actions";

export default async function TeacherTestsPage() {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session is not valid.");

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) throw new Error("Teacher profile is unavailable.");

  const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", profile.id).single();
  if (!teacher) throw new Error("Teacher record is unavailable.");

  const { data: tests, error } = await supabase
    .from("tests")
    .select(`
      id,
      title,
      description,
      status,
      test_date,
      max_marks,
      class:classes(name),
      subject:subjects(name),
      batch:batches(name)
    `)
    .eq("created_by_teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  async function publishTestAction(formData: FormData): Promise<void> {
    "use server";
    await publishTest(formData);
  }

  async function archiveTestAction(formData: FormData): Promise<void> {
    "use server";
    await archiveTest(formData);
  }

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>TEACHER TESTS</span>
        <h2>My Tests</h2>
        <p>Review and manage tests in your assigned class and subject scope.</p>
      </div>

      {error && <div className="alert-box alert-error" role="alert">Unable to load your tests.</div>}

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tests ?? []).map((test: any) => (
              <tr key={test.id}>
                <td>{test.title}</td>
                <td>{test.class?.name ? `Class ${test.class.name}` : "—"}</td>
                <td>{test.subject?.name ?? "—"}</td>
                <td>{test.batch?.name ?? "All batches"}</td>
                <td>{test.test_date}</td>
                <td>{test.max_marks}</td>
                <td><span className={`fee-badge badge-${String(test.status).toLowerCase()}`}>{test.status}</span></td>
                <td>
                  <div className="material-actions">
                    <Link href={`/teacher/tests/${test.id}/results`} className="button quiet">Results</Link>
                    <Link href={`/teacher/tests/${test.id}/edit`} className="button quiet">Edit</Link>
                    {test.status !== "PUBLISHED" && (
                      <form action={publishTestAction}><input type="hidden" name="testId" value={test.id} /><button type="submit" className="button primary">Publish</button></form>
                    )}
                    {test.status !== "ARCHIVED" && (
                      <form action={archiveTestAction}><input type="hidden" name="testId" value={test.id} /><button type="submit" className="button quiet">Archive</button></form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!tests?.length && <tr><td colSpan={8} className="empty-state">No tests in your assignment scope.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
