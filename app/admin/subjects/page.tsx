import { createClient } from "@/lib/supabase/server";
import { SubjectForm } from "./subject-form";

type Subject = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function SubjectsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, is_active, created_at")
    .order("name");
  const subjects = (data ?? []) as Subject[];

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>ACADEMIC CATALOG</span>
        <h2>Subject Management</h2>
        <p>Create and manage subjects used across Mentor Academy classes.</p>
      </div>

      {error && <div className="alert-box alert-error" role="alert">Unable to load subjects. Please try again later.</div>}

      <details open>
        <summary>Add Subject</summary>
        <SubjectForm />
      </details>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td><b>{subject.name}</b></td>
                <td>
                  <span className={`fee-badge ${subject.is_active ? "badge-success" : "badge-cancelled"}`}>
                    {subject.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                <td>{formatDate(subject.created_at)}</td>
                <td><span aria-label="No actions available">—</span></td>
              </tr>
            ))}
            {!subjects.length && (
              <tr>
                <td colSpan={4} className="empty-state">No subjects have been created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}