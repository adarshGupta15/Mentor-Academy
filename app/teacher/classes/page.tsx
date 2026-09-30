import { getTeacherPortalData } from "@/lib/teacher/data";

export default async function TeacherClassesPage() {
  const { assignments, error } = await getTeacherPortalData();
  return (
    <section className="teacher-page">
      <div className="teacher-heading"><span>TEACHING SCHEDULE</span><h2>My Classes</h2><p>Your current class, subject, and batch assignments.</p></div>
      {error && <div className="alert-box alert-error" role="alert">{error}</div>}
      <div className="data-table">
        <table>
          <thead><tr><th>Class</th><th>Subject</th><th>Batch</th><th>Timing</th><th>Days</th><th>Room</th></tr></thead>
          <tbody>
            {assignments.map((assignment) => <tr key={`${assignment.class_id}-${assignment.subject_id}-${assignment.batch_id ?? "all"}`}>
              <td>Class {assignment.class.name}</td><td>{assignment.subject.name}</td><td>{assignment.batch?.name ?? "All Batches"}</td>
              <td>{assignment.batch?.timing ?? "—"}</td><td>{assignment.batch?.days ?? "—"}</td><td>{assignment.batch?.room ?? "—"}</td>
            </tr>)}
            {!assignments.length && <tr><td colSpan={6} className="empty-state">No classes assigned yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}