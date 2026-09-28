import { createClient } from "@/lib/supabase/server";
import { BatchForm } from "./batch-form";

type ClassOption = {
  id: string;
  name: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BatchesPage() {
  const supabase = await createClient();
  const [batchResult, classResult] = await Promise.all([
    supabase
      .from("batches")
      .select("id, name, is_active, created_at, class_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name, is_active")
      .order("name"),
  ]);

  const batches = batchResult.data ?? [];
  const classRows = classResult.data ?? [];
  const classes: ClassOption[] = classRows
    .filter((item) => item.is_active)
    .map(({ id, name }) => ({ id, name }));
  const classNames = new Map<string, string>();
  for (const item of classRows) classNames.set(item.id, item.name);
  const loadError = batchResult.error || classResult.error;

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>ACADEMIC OPERATIONS</span>
        <h2>Batch Management</h2>
        <p>Create and manage batches used across Mentor Academy classes.</p>
      </div>

      {loadError && <div className="alert-box alert-error" role="alert">Unable to load batches. Please try again later.</div>}

      <details open>
        <summary>Create Batch</summary>
        <BatchForm classes={classes} />
      </details>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Class</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td><b>{batch.name}</b></td>
                <td>{classNames.get(batch.class_id) ? `Class ${classNames.get(batch.class_id)}` : "—"}</td>
                <td>
                  <span className={`fee-badge ${batch.is_active ? "badge-success" : "badge-cancelled"}`}>
                    {batch.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                <td>{formatDate(batch.created_at)}</td>
              </tr>
            ))}
            {!batches.length && (
              <tr>
                <td colSpan={4} className="empty-state">No batches have been created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}