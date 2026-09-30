import { getTeacherPortalData, getTeacherStudents } from "@/lib/teacher/data";
import { TeacherStudentsTable } from "./students-table";

export default async function TeacherStudentsPage() {
  const { supabase, error } = await getTeacherPortalData();
  const { students, error: studentError } = await getTeacherStudents(supabase);
  return (
    <section className="teacher-page">
      <div className="teacher-heading"><span>ACADEMIC ROSTER</span><h2>My Students</h2><p>Students within your assigned class and batch scope.</p></div>
      {(error || studentError) && <div className="alert-box alert-error" role="alert">{error ?? "Student roster could not be loaded. Apply the reviewed teacher-scope migration before using this page."}</div>}
      <TeacherStudentsTable students={studentError ? [] : students} />
    </section>
  );
}