import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/server";
import { saveTestResult } from "@/lib/tests/actions";

const percentage = (obtained: number, max: number) => {
  if (!max) return 0;
  return Number(((Number(obtained) / Number(max)) * 100).toFixed(2));
};

export default async function TeacherTestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("TEACHER");
  const { id } = await params;
  const supabase = await createClient();
  const { data: test, error: testError } = await supabase
    .from("tests")
    .select(`
      id, title, max_marks, class_id, subject_id, batch_id,
      class:classes(name), subject:subjects(name), batch:batches(name)
    `)
    .eq("id", id)
    .single();

  if (testError || !test) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user?.id).single();
  const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", profile?.id).single();

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select("class_id, subject_id, batch_id")
    .eq("teacher_id", teacher?.id)
    .eq("class_id", test.class_id)
    .eq("subject_id", test.subject_id);

  const allowed = assignments?.some((item: any) => item.batch_id === test.batch_id || (item.batch_id === null && test.batch_id === null) || (item.batch_id === null && test.batch_id !== null)) ?? false;

  if (!allowed) notFound();

  async function saveTestResultAction(formData: FormData): Promise<void> {
    "use server";
    await saveTestResult(formData);
  }

  const { data: students } = await supabase
    .from("students")
    .select("id, student_id, roll_number, profile:profiles(name), class:classes(name), batch:batches(name)")
    .eq("class_id", test.class_id)
    .order("student_id");

  const eligibleStudents = (students ?? []).filter((student: any) => !test.batch_id || student.batch_id === test.batch_id);
  const { data: results } = await supabase.from("test_results").select("student_id, obtained_marks, teacher_remarks").eq("test_id", id);
  const resultMap = new Map((results ?? []).map((result: any) => [result.student_id, result]));

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>TEACHER RESULTS</span>
        <h2>{test.title}</h2>
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
          </tbody>
        </table>
      </div>
      <div className="quick-actions">
        <Link href="/teacher/tests" className="button quiet">Back</Link>
      </div>
    </section>
  );
}
