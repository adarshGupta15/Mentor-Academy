import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { createTest, publishTest, archiveTest, deleteTest } from "@/lib/tests/actions";

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return value;
  }
};

export default async function AdminTestsPage() {
  await requireRole("ADMIN");
  const supabase = await createClient();
  const { data: tests, error } = await supabase
    .from("tests")
    .select(`
      id,
      title,
      description,
      class_id,
      subject_id,
      batch_id,
      test_date,
      max_marks,
      status,
      created_at,
      class:classes(name),
      subject:subjects(name),
      batch:batches(name),
      creator:profiles(name, email)
    `)
    .order("created_at", { ascending: false });

  const counts = {
    total: tests?.length ?? 0,
    published: tests?.filter((item) => item.status === "PUBLISHED").length ?? 0,
    drafts: tests?.filter((item) => item.status === "DRAFT").length ?? 0,
    archived: tests?.filter((item) => item.status === "ARCHIVED").length ?? 0,
  };

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
        <span>ASSESSMENTS</span>
        <h2>Tests & Results</h2>
        <p>Manage academic tests and student marks across classes and batches.</p>
      </div>

      {error && (
        <div className="alert-box alert-error" role="alert">
          Unable to load tests. Please try again later.
        </div>
      )}

      <div className="metric-grid">
        <article><p>Total Tests</p><b>{counts.total}</b></article>
        <article><p>Published</p><b>{counts.published}</b></article>
        <article><p>Drafts</p><b>{counts.drafts}</b></article>
        <article><p>Archived</p><b>{counts.archived}</b></article>
      </div>

      <div className="quick-actions" style={{ marginTop: 16 }}>
        <Link href="/admin/tests/new" className="button primary">Create Test</Link>
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
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tests ?? []).map((test: any) => (
              <tr key={test.id}>
                <td><b>{test.title}</b>{test.description ? <div><small>{test.description}</small></div> : null}</td>
                <td>{test.class?.name ? `Class ${test.class.name}` : "—"}</td>
                <td>{test.subject?.name ?? "—"}</td>
                <td>{test.batch?.name ?? "All batches"}</td>
                <td>{formatDate(test.test_date)}</td>
                <td>{test.max_marks}</td>
                <td><span className={`fee-badge badge-${String(test.status).toLowerCase()}`}>{test.status}</span></td>
                <td>{test.creator?.name ?? "—"}</td>
                <td>
                  <div className="material-actions">
                    <Link href={`/admin/tests/${test.id}/results`} className="button quiet">Results</Link>
                    <Link href={`/admin/tests/${test.id}/edit`} className="button quiet">Edit</Link>
                    {test.status !== "PUBLISHED" && (
                      <form action={publishTestAction}>
                        <input type="hidden" name="testId" value={test.id} />
                        <button type="submit" className="button primary">Publish</button>
                      </form>
                    )}
                    {test.status !== "ARCHIVED" && (
                      <form action={archiveTestAction}>
                        <input type="hidden" name="testId" value={test.id} />
                        <button type="submit" className="button quiet">Archive</button>
                      </form>
                    )}
                    <form action={deleteTestAction}>
                      <input type="hidden" name="testId" value={test.id} />
                      <button type="submit" className="button danger">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!tests?.length && (
              <tr>
                <td colSpan={9} className="empty-state">No tests have been created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
