"use client";

import { useState, useTransition } from "react";
import { createFeeAssignment, recordManualPayment } from "@/lib/admin/actions";
import { AlertCircle, CheckCircle2, CreditCard, PlusCircle } from "lucide-react";

export interface StudentOption {
  id: string;
  student_id: string;
  name: string;
  className?: string;
  batchName?: string;
}

export interface StructureOption {
  id: string;
  name: string;
  amount: number; // in paise
  frequency: string;
}

export interface AssignmentOption {
  id: string;
  studentName: string;
  studentId: string;
  className?: string;
  remainingPaise: number;
  totalPaise: number;
  dueDate?: string | null;
}

export function AssignFeeForm({
  students,
  structures,
}: {
  students: StudentOption[];
  structures: StructureOption[];
}) {
  const [studentId, setStudentId] = useState("");
  const [structureId, setStructureId] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStructureChange(id: string) {
    setStructureId(id);
    if (!id) return;
    const found = structures.find((s) => s.id === id);
    if (found && found.amount > 0) {
      setAmountRupees(String(found.amount / 100));
    }
  }

  async function handleAssignSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const rupees = Number(amountRupees);
    if (!studentId) {
      setError("Please select a student.");
      return;
    }
    if (isNaN(rupees) || rupees <= 0) {
      setError("Please enter a valid amount greater than ₹0.");
      return;
    }

    const paise = Math.round(rupees * 100);
    formData.set("studentId", studentId);
    formData.set("structureId", structureId || "");
    formData.set("amount", String(paise));
    formData.set("dueDate", dueDate || "");
    formData.set("notes", notes || "");

    startTransition(async () => {
      try {
        await createFeeAssignment(formData);
        setSuccess(`Fee of ₹${rupees.toLocaleString("en-IN")} assigned successfully.`);
        setStudentId("");
        setStructureId("");
        setAmountRupees("");
        setDueDate("");
        setNotes("");
      } catch (err: any) {
        setError(err?.message || "Failed to assign fee. Please try again.");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {error && (
        <div className="alert-box alert-error" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert-box alert-success" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <form action={handleAssignSubmit} className="form-grid">
        <label>
          Student *
          <select
            name="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            disabled={isPending}
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.student_id}){s.className ? ` — Class ${s.className}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fee Structure (Optional)
          <select
            name="structureId"
            value={structureId}
            onChange={(e) => handleStructureChange(e.target.value)}
            disabled={isPending}
          >
            <option value="">Custom / No Structure</option>
            {structures.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} (₹{(st.amount / 100).toLocaleString("en-IN")} / {st.frequency})
              </option>
            ))}
          </select>
        </label>

        <label>
          Amount (₹) *
          <input
            type="number"
            min="1"
            step="any"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            placeholder="e.g. 5000"
            required
            disabled={isPending}
          />
        </label>

        <label>
          Due Date
          <input
            type="date"
            name="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isPending}
          />
        </label>

        <label>
          Notes
          <input
            type="text"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Term 1 Tuition Fee"
            disabled={isPending}
          />
        </label>

        <button type="submit" className="button primary" disabled={isPending}>
          <PlusCircle size={16} />
          {isPending ? "Assigning Fee…" : "Assign Fee"}
        </button>
      </form>
    </div>
  );
}

export function RecordPaymentForm({
  assignments,
  preselectedAssignmentId,
}: {
  assignments: AssignmentOption[];
  preselectedAssignmentId?: string;
}) {
  const [assignmentId, setAssignmentId] = useState(preselectedAssignmentId || "");
  const [amountRupees, setAmountRupees] = useState("");
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "ONLINE">("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedAssignment = assignments.find((a) => a.id === assignmentId);
  const maxRupees = selectedAssignment ? Math.max(0, selectedAssignment.remainingPaise / 100) : 0;

  function handleAssignmentSelect(id: string) {
    setAssignmentId(id);
    const found = assignments.find((a) => a.id === id);
    if (found) {
      setAmountRupees(String(found.remainingPaise / 100));
    } else {
      setAmountRupees("");
    }
  }

  async function handlePaymentSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    if (!assignmentId) {
      setError("Please select a fee assignment.");
      return;
    }

    const rupees = Number(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      setError("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    if (rupees > maxRupees) {
      setError(`Payment cannot exceed the remaining balance of ₹${maxRupees.toLocaleString("en-IN")}.`);
      return;
    }

    const paise = Math.round(rupees * 100);
    formData.set("assignmentId", assignmentId);
    formData.set("amount", String(paise));
    formData.set("method", method);
    formData.set("reference", reference || "");
    formData.set("notes", notes || "");

    startTransition(async () => {
      try {
        await recordManualPayment(formData);
        setSuccess(`Payment of ₹${rupees.toLocaleString("en-IN")} recorded successfully.`);
        setAssignmentId("");
        setAmountRupees("");
        setReference("");
        setNotes("");
      } catch (err: any) {
        setError(err?.message || "Failed to record payment. Please try again.");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {error && (
        <div className="alert-box alert-error" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert-box alert-success" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <form action={handlePaymentSubmit} className="form-grid">
        <label style={{ gridColumn: "span 2" }}>
          Fee Account / Assignment *
          <select
            name="assignmentId"
            value={assignmentId}
            onChange={(e) => handleAssignmentSelect(e.target.value)}
            required
            disabled={isPending || assignments.length === 0}
          >
            <option value="">
              {assignments.length === 0
                ? "No pending fee accounts available"
                : "Select fee assignment to settle"}
            </option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.studentName} ({a.studentId}){a.className ? ` — Class ${a.className}` : ""} — Due: ₹
                {(a.remainingPaise / 100).toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </label>

        <label>
          Payment Amount (₹) *
          <input
            type="number"
            min="1"
            max={maxRupees > 0 ? maxRupees : undefined}
            step="any"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            placeholder={maxRupees > 0 ? `Max ₹${maxRupees}` : "Amount (₹)"}
            required
            disabled={isPending || !assignmentId}
          />
        </label>

        <label>
          Payment Method *
          <select
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            required
            disabled={isPending}
          >
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Debit / Credit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
            <option value="ONLINE">Online Portal</option>
          </select>
        </label>

        <label>
          Transaction Reference
          <input
            type="text"
            name="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. UPI UTR / Cheque #"
            disabled={isPending}
          />
        </label>

        <label>
          Notes
          <input
            type="text"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid at front office"
            disabled={isPending}
          />
        </label>

        <button
          type="submit"
          className="button primary"
          disabled={isPending || !assignmentId || assignments.length === 0}
          style={{ gridColumn: "span 2" }}
        >
          <CreditCard size={16} />
          {isPending ? "Recording Payment…" : "Record Payment & Generate Receipt"}
        </button>
      </form>
    </div>
  );
}

export function QuickPaymentTrigger({
  assignmentId,
  studentName,
  remainingPaise,
}: {
  assignmentId: string;
  studentName: string;
  remainingPaise: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [amountRupees, setAmountRupees] = useState(String(remainingPaise / 100));
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "ONLINE">("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxRupees = Math.max(0, remainingPaise / 100);

  async function handleQuickPayment(formData: FormData) {
    setError(null);
    const rupees = Number(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      setError("Enter a valid amount > ₹0.");
      return;
    }
    if (rupees > maxRupees) {
      setError(`Cannot exceed ₹${maxRupees.toLocaleString("en-IN")}.`);
      return;
    }

    const paise = Math.round(rupees * 100);
    formData.set("assignmentId", assignmentId);
    formData.set("amount", String(paise));
    formData.set("method", method);
    formData.set("reference", reference || "");
    formData.set("notes", notes || "");

    startTransition(async () => {
      try {
        await recordManualPayment(formData);
        setIsOpen(false);
      } catch (err: any) {
        setError(err?.message || "Failed to record payment.");
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="table-action-btn"
        onClick={() => {
          setAmountRupees(String(remainingPaise / 100));
          setIsOpen(true);
        }}
      >
        <CreditCard size={13} />
        Pay
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(7, 60, 66, 0.45)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "24px",
          width: "min(480px, 100%)",
          boxShadow: "0 16px 40px rgba(7, 60, 66, 0.2)",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", color: "var(--deep)" }}>Record Payment</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{ border: 0, background: "none", cursor: "pointer", fontSize: "18px", color: "var(--muted)" }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--muted)" }}>
          Student: <b>{studentName}</b>
          <br />
          Outstanding balance: <b style={{ color: "var(--deep)" }}>₹{maxRupees.toLocaleString("en-IN")}</b>
        </p>

        {error && (
          <div className="alert-box alert-error" style={{ marginBottom: "14px", fontSize: "12px", padding: "10px" }}>
            {error}
          </div>
        )}

        <form action={handleQuickPayment} style={{ display: "grid", gap: "12px" }}>
          <label style={{ display: "grid", gap: "4px", fontSize: "12px", fontWeight: 700 }}>
            Amount (₹) *
            <input
              type="number"
              min="1"
              max={maxRupees}
              step="any"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              required
              disabled={isPending}
              style={{ border: "1px solid #cbd9d4", padding: "9px 12px", borderRadius: "4px" }}
            />
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", fontWeight: 700 }}>
            Payment Method *
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              disabled={isPending}
              style={{ border: "1px solid #cbd9d4", padding: "9px 12px", borderRadius: "4px" }}
            >
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", fontWeight: 700 }}>
            Transaction Reference
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UPI Ref / Cheque No"
              disabled={isPending}
              style={{ border: "1px solid #cbd9d4", padding: "9px 12px", borderRadius: "4px" }}
            />
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", fontWeight: 700 }}>
            Notes
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks"
              disabled={isPending}
              style={{ border: "1px solid #cbd9d4", padding: "9px 12px", borderRadius: "4px" }}
            />
          </label>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
            <button
              type="button"
              className="button"
              style={{ padding: "10px 16px", border: "1px solid var(--line)" }}
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              style={{ padding: "10px 16px" }}
              disabled={isPending}
            >
              {isPending ? "Recording…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
