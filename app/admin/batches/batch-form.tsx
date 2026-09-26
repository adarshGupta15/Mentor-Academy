"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, PlusCircle } from "lucide-react";
import { createBatch } from "@/lib/admin/actions";

type ClassOption = {
  id: string;
  name: string;
};

export function BatchForm({ classes }: { classes: ClassOption[] }) {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await createBatch(formData);
        setName("");
        setClassId("");
        setSuccess("Batch created successfully.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create batch.");
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
          Batch Name
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Morning Batch"
            maxLength={160}
            required
            disabled={isPending}
          />
        </label>
        <label>
          Class
          <select
            name="classId"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            required
            disabled={isPending}
          >
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>Class {item.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="button primary" disabled={isPending || !classes.length}>
          <PlusCircle size={16} />
          {isPending ? "Creating Batch..." : "Create Batch"}
        </button>
      </form>
    </div>
  );
}