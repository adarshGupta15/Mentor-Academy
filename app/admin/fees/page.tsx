import { createClient } from "@/lib/supabase/server";
import {
  AssignFeeForm,
  RecordPaymentForm,
  QuickPaymentTrigger,
  type StudentOption,
  type StructureOption,
  type AssignmentOption,
} from "./fee-client";

const formatINR = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, paise) / 100);

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default async function AdminFeesPage() {
  const supabase = await createClient();

  let queryError: string | null = null;
  let studentsData: any[] = [];
  let structuresData: any[] = [];
  let assignmentsData: any[] = [];
  let paymentsData: any[] = [];

  try {
    const [
      { data: students, error: sErr },
      { data: structures, error: stErr },
      { data: assignments, error: aErr },
      { data: payments, error: pErr },
    ] = await Promise.all([
      supabase
        .from("students")
        .select(`
          id,
          student_id,
          roll_number,
          profile:profiles(id, name, email, phone, is_active),
          class:classes(id, name),
          batch:batches(id, name)
        `)
        .order("student_id"),

      supabase
        .from("fee_structures")
        .select("id, name, amount, frequency, is_active, class:classes(name)")
        .eq("is_active", true)
        .order("name"),

      supabase
        .from("student_fee_assignments")
        .select(`
          id,
          amount,
          due_date,
          status,
          notes,
          created_at,
          fee_structure:fee_structures(id, name, frequency),
          student:students(
            id,
            student_id,
            roll_number,
            profile:profiles(id, name, email, phone),
            class:classes(id, name),
            batch:batches(id, name)
          ),
          payments:fee_payments(
            id,
            amount,
            payment_method,
            payment_status,
            paid_at,
            receipt_number,
            transaction_reference
          )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("fee_payments")
        .select(`
          id,
          amount,
          payment_method,
          payment_status,
          paid_at,
          receipt_number,
          transaction_reference,
          notes,
          student:students(
            id,
            student_id,
            profile:profiles(name)
          ),
          assignment:student_fee_assignments(
            id,
            amount,
            status
          )
        `)
        .order("paid_at", { ascending: false }),
    ]);

    if (sErr || stErr || aErr || pErr) {
      const err = sErr || stErr || aErr || pErr;
      queryError = err?.message ?? "Unable to load some fee records.";
    }

    studentsData = students ?? [];
    structuresData = structures ?? [];
    assignmentsData = assignments ?? [];
    paymentsData = payments ?? [];
  } catch (err: any) {
    queryError = "Unable to connect to the database. Please try again later.";
  }

  // Calculate Metrics
  // Total Fee Due: remaining balance across all assignments that are not PAID or CANCELLED
  const totalRemainingPaise = assignmentsData
    .filter((a) => a.status !== "PAID" && a.status !== "CANCELLED")
    .reduce((sum, a) => {
      const paid = (a.payments ?? [])
        .filter((p: any) => p.payment_status === "SUCCESS")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      return sum + Math.max(0, Number(a.amount) - paid);
    }, 0);

  // Total Collected: sum of all successful payments
  const totalCollectedPaise = paymentsData
    .filter((p) => p.payment_status === "SUCCESS")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Counts
  const pendingAccountsCount = assignmentsData.filter(
    (a) => a.status === "PENDING" || a.status === "PARTIAL" || a.status === "OVERDUE"
  ).length;

  const paidAccountsCount = assignmentsData.filter((a) => a.status === "PAID").length;

  // Prepare client options
  const studentOptions: StudentOption[] = studentsData.map((s) => ({
    id: s.id,
    student_id: s.student_id,
    name: s.profile?.name ?? "Student",
    className: s.class?.name,
    batchName: s.batch?.name,
  }));

  const structureOptions: StructureOption[] = structuresData.map((st) => ({
    id: st.id,
    name: st.name,
    amount: Number(st.amount),
    frequency: st.frequency,
  }));

  const eligibleAssignments: AssignmentOption[] = assignmentsData
    .map((a) => {
      const paid = (a.payments ?? [])
        .filter((p: any) => p.payment_status === "SUCCESS")
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const remaining = Math.max(0, Number(a.amount) - paid);
      return {
        id: a.id,
        studentName: a.student?.profile?.name ?? "Unknown",
        studentId: a.student?.student_id ?? "—",
        className: a.student?.class?.name,
        remainingPaise: remaining,
        totalPaise: Number(a.amount),
        dueDate: a.due_date,
      };
    })
    .filter((a) => a.remainingPaise > 0);

  return (
    <section className="manage">
      <div>
        <h2>Fee Management</h2>
        <p>Assign fees, track outstanding balances, and record payments.</p>
      </div>

      {queryError && (
        <div className="alert-box alert-error">
          <b>Notice:</b> {queryError}
        </div>
      )}

      {/* 1. METRIC CARDS */}
      <section className="metric-grid">
        <article>
          <p>Total Fee Due</p>
          <b>{formatINR(totalRemainingPaise)}</b>
        </article>
        <article>
          <p>Total Collected</p>
          <b>{formatINR(totalCollectedPaise)}</b>
        </article>
        <article>
          <p>Pending / Partial Accounts</p>
          <b>{pendingAccountsCount}</b>
        </article>
        <article>
          <p>Paid Accounts</p>
          <b>{paidAccountsCount}</b>
        </article>
      </section>

      {/* 2. ASSIGN FEE FORM */}
      <details open>
        <summary>Assign Fee to Student</summary>
        <AssignFeeForm students={studentOptions} structures={structureOptions} />
      </details>

      {/* 4. RECORD MANUAL PAYMENT */}
      <details>
        <summary>Record Offline / Manual Payment</summary>
        <RecordPaymentForm assignments={eligibleAssignments} />
      </details>

      {/* 3. FEE ASSIGNMENTS TABLE */}
      <div>
        <h3 style={{ fontSize: "19px", margin: "0 0 12px", color: "var(--deep)" }}>
          Fee Assignments
        </h3>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class / Batch</th>
                <th>Due Date</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignmentsData.map((a: any) => {
                const paid = (a.payments ?? [])
                  .filter((p: any) => p.payment_status === "SUCCESS")
                  .reduce((s: number, p: any) => s + Number(p.amount), 0);
                const remaining = Math.max(0, Number(a.amount) - paid);
                const statusClass = `fee-badge badge-${String(a.status).toLowerCase()}`;

                return (
                  <tr key={a.id}>
                    <td>
                      <b>{a.student?.profile?.name ?? "—"}</b>
                      {a.student?.profile?.email && (
                        <>
                          <br />
                          <small style={{ color: "var(--muted)" }}>{a.student.profile.email}</small>
                        </>
                      )}
                    </td>
                    <td>{a.student?.student_id ?? "—"}</td>
                    <td>
                      {a.student?.class?.name ? `Class ${a.student.class.name}` : "—"}
                      {a.student?.batch?.name ? ` / ${a.student.batch.name}` : ""}
                    </td>
                    <td>{formatDate(a.due_date)}</td>
                    <td><b>{formatINR(Number(a.amount))}</b></td>
                    <td style={{ color: paid > 0 ? "var(--teal)" : "inherit" }}>
                      {formatINR(paid)}
                    </td>
                    <td style={{ color: remaining > 0 ? "#aa2212" : "var(--muted)" }}>
                      <b>{formatINR(remaining)}</b>
                    </td>
                    <td>
                      <span className={statusClass}>{a.status}</span>
                    </td>
                    <td>
                      {remaining > 0 && a.status !== "CANCELLED" ? (
                        <QuickPaymentTrigger
                          assignmentId={a.id}
                          studentName={a.student?.profile?.name ?? "Student"}
                          remainingPaise={remaining}
                        />
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: "12px" }}>Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!assignmentsData.length && (
                <tr>
                  <td colSpan={9} className="empty-state">
                    No fee assignments recorded yet. Use the form above to assign a fee to a student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. RECENT PAYMENTS */}
      <div>
        <h3 style={{ fontSize: "19px", margin: "0 0 12px", color: "var(--deep)" }}>
          Recent Payments
        </h3>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Student</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentsData.map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <b style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--deep)" }}>
                      {p.receipt_number ?? "—"}
                    </b>
                  </td>
                  <td>{formatDate(p.paid_at)}</td>
                  <td>
                    <b>{p.student?.profile?.name ?? "—"}</b>
                    {p.student?.student_id && (
                      <>
                        <br />
                        <small style={{ color: "var(--muted)" }}>({p.student.student_id})</small>
                      </>
                    )}
                  </td>
                  <td><b>{formatINR(Number(p.amount))}</b></td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: "12px" }}>{p.payment_method}</span>
                  </td>
                  <td>
                    <small style={{ color: "var(--muted)" }}>{p.transaction_reference ?? "—"}</small>
                  </td>
                  <td>
                    <span
                      className={`fee-badge badge-${
                        p.payment_status === "SUCCESS"
                          ? "paid"
                          : p.payment_status === "PENDING"
                          ? "pending"
                          : "cancelled"
                      }`}
                    >
                      {p.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
              {!paymentsData.length && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No payment records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
