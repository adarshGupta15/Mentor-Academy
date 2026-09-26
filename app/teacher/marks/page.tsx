import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";

export default async function TeacherMarksPage() {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user?.id).single();
  const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", profile?.id).single();

  const { data: tests } = await supabase
    .from("tests")
    .select(`
      id,
      title,
      class:classes(name),
      subject:subjects(name),
      batch:batches(name),
      max_marks,
      test_date,
      status
    `)
    .eq("created_by_teacher_id", teacher?.id)
    .order("test_date", { ascending: false });

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>MARK ENTRY</span>
        <h2>Teacher Marks</h2>
      </div>
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
            {(tests ?? []).map((test: any) => (
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
            {!tests?.length && <tr><td colSpan={7} className="empty-state">No tests available for marks entry.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
