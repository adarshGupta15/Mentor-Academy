import { createClient } from "@/lib/supabase/server";
import { LinkingClient } from "./linking-client";

type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; is_active: boolean };
type Assignment = { class_id: string; subject_id: string; subject: SubjectOption | null };

export default async function ClassSubjectsPage() {
  const supabase = await createClient();
  const [classesResult, subjectsResult, assignmentsResult] = await Promise.all([
    supabase.from("classes").select("id, name").order("name"),
    supabase.from("subjects").select("id, name, is_active").order("name"),
    supabase.from("class_subjects").select("class_id, subject_id").order("created_at"),
  ]);

  const classes = (classesResult.data ?? []) as ClassOption[];
  const subjects = (subjectsResult.data ?? []) as SubjectOption[];
  const assignments: Assignment[] = (assignmentsResult.data ?? []).map(({ class_id, subject_id }) => ({
    class_id,
    subject_id,
    subject: subjects.find((item) => item.id === subject_id) ?? null,
  }));
  const loadError = classesResult.error || subjectsResult.error || assignmentsResult.error;

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>ACADEMIC STRUCTURE</span>
        <h2>Class-Subject Linking</h2>
        <p>Assign the subjects available to each Mentor Academy class.</p>
      </div>
      {loadError && <div className="alert-box alert-error" role="alert">Unable to load class-subject assignments. Please try again later.</div>}
      {!classes.length && <div className="empty-state">No classes have been created yet.</div>}
      {classes.length > 0 && (
        <LinkingClient
          classes={classes}
          subjects={subjects}
          assignments={assignments}
        />
      )}
    </section>
  );
}