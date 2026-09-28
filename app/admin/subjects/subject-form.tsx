"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, PlusCircle } from "lucide-react";
import { createSubject } from "@/lib/admin/actions";

export function SubjectForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await createSubject(formData);
        setName("");
        setSuccess("Subject added successfully.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to add subject.");
      }
    });
  }

  return (
    <div>
      {error && (
        <div className="alert-box alert-error" role="alert" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert-box alert-success" role="status" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}
      <form action={handleSubmit} className="form-grid">
        <label>
          Subject Name
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Mathematics"
            maxLength={160}
            required
            disabled={isPending}
          />
        </label>
        <button type="submit" className="button primary" disabled={isPending}>
          <PlusCircle size={16} />
          {isPending ? "Adding Subject..." : "Add Subject"}
        </button>
      </form>
    </div>
  );
}