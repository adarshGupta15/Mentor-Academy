import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { saveTestResult } from "@/lib/tests/actions";

const percentage = (obtained: number, max: number) => {
  if (!max) return 0;
  return Number(((Number(obtained) / Number(max)) * 100).toFixed(2));
};

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  return (Array.isArray(relation) ? relation[0] : relation) ?? null;
}

 export default async function TestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const supabase = await createClient();
  const { data: test, error: testError } = await supabase
    .from("tests")
    .select(`
      id, title, max_marks, class_id, subject_id, batch_id, status,
      class:classes(name), subject:subjects(name), batch:batches(name)
    `)
    .eq("id", id)
    .single();

  if (testError || !test) notFound();

  const { data: students } = await supabase
    .from("students")
    .select(`
      id, student_id, roll_number,
      profile:profiles(name, email),
      class:classes(name), batch:batches(name)
    `)
    .eq("class_id", test.class_id)
    .order("student_id");

  const eligibleStudents = (students ?? []).filter((student: any) => {
    if (!test.batch_id) return true;
    return student.batch_id === test.batch_id;
  });

  const { data: results } = await supabase
    .from("test_results")
    .select("id, student_id, obtained_marks, teacher_remarks")
    .eq("test_id", id);

  const resultMap = new Map((results ?? []).map((result: any) => [result.student_id, result]));
  const testClass = firstRelation(test.class);
  const testSubject = firstRelation(test.subject);
  const testBatch = firstRelation(test.batch);

  async function saveTestResultAction(formData: FormData): Promise<void> {
    "use server";
    await saveTestResult(formData);
  }

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>RESULTS</span>
        <h2>{test.title}</h2>
        <p>{testClass?.name} · {testSubject?.name} · {testBatch?.name ? `Batch ${testBatch.name}` : "All batches"}</p>
      </div>

      <div className="quick-actions" style={{ marginTop: 12 }}>
        <Link href="/admin/tests" className="button quiet">Back to tests</Link>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Roll</th>
              <th>Batch</th>
              <th>Marks</th>
              <th>%</th>
              <th>Remarks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(eligibleStudents ?? []).map((student: any) => {
              const result = resultMap.get(student.id);
              return (
                <tr key={student.id}>
                  <td colSpan={7}>
                    <form action={saveTestResultAction} className="inline-form" style={{ display: "grid", gridTemplateColumns: "1.8fr 0.8fr 1fr 1.4fr 0.8fr 2fr auto", gap: "0.75rem", alignItems: "center" }}>
                      <div>{student.profile?.name ?? "Student"}</div>
                      <div>{student.roll_number ?? "—"}</div>
                      <div>{student.batch?.name ?? "—"}</div>
                      <div>
                        <input type="hidden" name="testId" value={test.id} />
                        <input type="hidden" name="studentId" value={student.id} />
                        <input type="number" min={0} max={test.max_marks} name="obtainedMarks" defaultValue={result?.obtained_marks ?? 0} step="0.01" required />
                        <small> / {test.max_marks}</small>
                      </div>
                      <div>{percentage(result?.obtained_marks ?? 0, test.max_marks)}%</div>
                      <div>
                        <input type="text" name="remarks" defaultValue={result?.teacher_remarks ?? ""} placeholder="Optional remarks" />
                      </div>
                      <div>
                        <button type="submit" className="button primary">Save</button>
                      </div>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!eligibleStudents.length && (
              <tr><td colSpan={7} className="empty-state">No eligible students found for this test.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
