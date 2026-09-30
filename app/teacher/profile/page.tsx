import { getTeacherPortalData } from "@/lib/teacher/data";

export default async function TeacherProfilePage() {
  const { teacher, error } = await getTeacherPortalData();
  return (
    <section className="teacher-page">
      <div className="teacher-heading"><span>ACCOUNT DETAILS</span><h2>Teacher Profile</h2><p>Your profile information is read-only.</p></div>
      {error && <div className="alert-box alert-error" role="alert">{error}</div>}
      {teacher ? <div className="teacher-profile-grid">
        <div><span>Name</span><strong>{teacher.name}</strong></div>
        <div><span>Email</span><strong>{teacher.email}</strong></div>
        <div><span>Teacher ID</span><strong>{teacher.teacher_id}</strong></div>
        <div><span>Role</span><strong>{teacher.role}</strong></div>
        <div><span>Active Status</span><strong>{teacher.is_active ? "Active" : "Inactive"}</strong></div>
        <div><span>Qualification</span><strong>{teacher.qualification || "Not provided"}</strong></div>
        <div><span>Experience</span><strong>{teacher.experience == null ? "Not provided" : `${teacher.experience} years`}</strong></div>
      </div> : !error && <div className="empty-state">Teacher profile is unavailable.</div>}
    </section>
  );
}