import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";

export default async function StudentTestsPage() {
  await requireRole("STUDENT");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session is not valid.");

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) throw new Error("Profile not found.");

  const { data: student } = await supabase.from("students").select("id, class_id, batch_id").eq("profile_id", profile.id).single();
  if (!student) throw new Error("Student record is unavailable.");

  const { data: tests, error } = await supabase
    .from("tests")
    .select(`
      id,
      title,
      description,
      test_date,
      max_marks,
      status,
      class:classes(name),
      subject:subjects(name),
      batch:batches(name)
    `)
    .eq("status", "PUBLISHED")
    .eq("class_id", student.class_id)
    .order("test_date", { ascending: false });

  const visibleTests = (tests ?? []).filter((test: any) => !test.batch_id || test.batch_id === student.batch_id);

  return (
    <main className="student-profile-page">
      <div className="student-profile-inner">
        <section className="profile-heading">
          <span>STUDENT PORTAL</span>
          <h1>Published Tests</h1>
          <p>Review academic tests relevant to your class and batch.</p>
        </section>

        {error && <div className="alert-box alert-error" role="alert">Some test information could not be loaded.</div>}

        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Max Marks</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {(visibleTests ?? []).map((test: any) => (
                <tr key={test.id}>
                  <td><b>{test.title}</b>{test.description ? <><br /><small>{test.description}</small></> : null}</td>
                  <td>{test.subject?.name ?? "—"}</td>
                  <td>{test.test_date}</td>
                  <td>{test.max_marks}</td>
                  <td>{test.status === "PUBLISHED" ? "Published" : "—"}</td>
                </tr>
              ))}
              {!visibleTests.length && (
                <tr><td colSpan={5} className="empty-state">No published tests are currently available for your class and batch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
