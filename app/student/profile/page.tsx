import Link from "next/link";
import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

type Student = {
  student_id: string;
  roll_number: string | null;
  class_id: string | null;
  batch_id: string | null;
};

type NamedRecord = { name: string } | null;

function valueOrFallback(value: string | null | undefined) {
  return value?.trim() || "Not available";
}

export default async function StudentProfilePage() {
  const identity = await requireRole("STUDENT");
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email, phone, role")
    .eq("user_id", identity.id)
    .single();

  let student: Student | null = null;
  let studentError: string | null = null;
  let classRecord: NamedRecord = null;
  let batchRecord: NamedRecord = null;

  if (profile) {
    const result = await supabase
      .from("students")
      .select("student_id, roll_number, class_id, batch_id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    student = result.data as Student | null;
    studentError = result.error?.message ?? null;

    if (student?.class_id) {
      const { data } = await supabase.from("classes").select("name").eq("id", student.class_id).maybeSingle();
      classRecord = data as NamedRecord;
    }
    if (student?.batch_id) {
      const { data } = await supabase.from("batches").select("name").eq("id", student.batch_id).maybeSingle();
      batchRecord = data as NamedRecord;
    }
  }

  const loadError = profileError || (studentError ? new Error(studentError) : null);

  return (
    <main className="student-profile-page">
      <div className="student-profile-inner">
        <Link href="/student" className="profile-back"><ArrowLeft size={15} /> Back to dashboard</Link>
        <section className="profile-heading">
          <span>STUDENT PORTAL</span>
          <h1>My Profile</h1>
          <p>View the account and student information linked to your Mentor Academy access.</p>
        </section>

        {loadError && <div className="alert-box alert-error" role="alert">Some profile information could not be loaded. Please try again later.</div>}

        {!profile && !profileError && <div className="profile-empty">Your profile information is not available yet.</div>}

        {profile && (
          <div className="profile-sections">
            <section className="profile-card profile-summary">
              <div className="profile-avatar"><UserRound size={25} /></div>
              <div><p className="profile-kicker">Student account</p><h2>{profile.name}</h2><p className="profile-muted">{profile.email}</p></div>
            </section>
            <section className="profile-card">
              <h2>Account Information</h2>
              <div className="profile-grid">
                <div><span>Name</span><b>{valueOrFallback(profile.name)}</b></div>
                <div><span>Email</span><b><Mail size={14} /> {valueOrFallback(profile.email)}</b></div>
                <div><span>Phone</span><b><Phone size={14} /> {valueOrFallback(profile.phone)}</b></div>
                <div><span>Role</span><b>{valueOrFallback(profile.role)}</b></div>
              </div>
            </section>
            <section className="profile-card">
              <h2>Student Information</h2>
              {student ? <div className="profile-grid">
                <div><span>Student ID</span><b>{valueOrFallback(student.student_id)}</b></div>
                <div><span>Roll Number</span><b>{valueOrFallback(student.roll_number)}</b></div>
                <div><span>Class</span><b>{valueOrFallback(classRecord?.name)}</b></div>
                <div><span>Batch</span><b>{valueOrFallback(batchRecord?.name)}</b></div>
              </div> : <p className="profile-muted">Student details are not available yet.</p>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}