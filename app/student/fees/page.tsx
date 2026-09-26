import Link from "next/link";
import { ArrowLeft, CreditCard, IndianRupee, WalletCards } from "lucide-react";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

type Assignment = {
  id: string;
  amount: number;
  due_date: string | null;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
  notes: string | null;
  fee_structure: { name: string } | null;
};

type Payment = {
  id: string;
  fee_assignment_id: string;
  amount: number;
  payment_method: string;
  paid_at: string | null;
  receipt_number: string | null;
  transaction_reference: string | null;
};

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.max(0, paise) / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatStatus(status: Assignment["status"]) {
  return { PENDING: "Pending", PARTIAL: "Partially Paid", PAID: "Paid", OVERDUE: "Overdue", CANCELLED: "Cancelled" }[status];
}

export default async function StudentFeesPage() {
  await requireRole("STUDENT");
  const supabase = await createClient();
  const [{ data: assignments, error: assignmentsError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("student_fee_assignments").select("id, amount, due_date, status, notes, fee_structure:fee_structures(name)").order("created_at", { ascending: false }),
    supabase.from("fee_payments").select("id, fee_assignment_id, amount, payment_method, paid_at, receipt_number, transaction_reference").eq("payment_status", "SUCCESS").order("paid_at", { ascending: false }),
  ]);

  const assignmentRows = (assignments ?? []) as Assignment[];
  const paymentRows = (payments ?? []) as Payment[];
  const paidByAssignment = paymentRows.reduce<Record<string, number>>((totals, payment) => {
    totals[payment.fee_assignment_id] = (totals[payment.fee_assignment_id] ?? 0) + Number(payment.amount);
    return totals;
  }, {});
  const totalAssigned = assignmentRows.reduce((total, assignment) => total + Number(assignment.amount), 0);
  const totalPaid = paymentRows.reduce((total, payment) => total + Number(payment.amount), 0);
  const totalRemaining = assignmentRows.reduce((total, assignment) => total + Math.max(0, Number(assignment.amount) - (paidByAssignment[assignment.id] ?? 0)), 0);
  const loadError = assignmentsError || paymentsError;

  return (
    <main className="student-profile-page">
      <div className="student-profile-inner student-fees-inner">
        <Link href="/student" className="profile-back"><ArrowLeft size={15} /> Back to dashboard</Link>
        <section className="profile-heading"><span>STUDENT PORTAL</span><h1>My Fees</h1><p>Review your fee assignments, remaining balance and successful payment history.</p></section>
        {loadError && <div className="alert-box alert-error" role="alert">Some fee information could not be loaded. Please try again later.</div>}

        <section className="fee-summary-grid" aria-label="Fee summary">
          <article><span>Total Assigned</span><b><IndianRupee size={18} />{formatINR(totalAssigned)}</b></article>
          <article><span>Total Paid</span><b><CreditCard size={18} />{formatINR(totalPaid)}</b></article>
          <article><span>Total Remaining</span><b><WalletCards size={18} />{formatINR(totalRemaining)}</b></article>
        </section>

        <section className="fee-section"><h2>Fee Assignments</h2>{!assignmentRows.length ? <div className="profile-empty">No fee assignments have been recorded for your account.</div> : <div className="data-table"><table><thead><tr><th>Assignment</th><th>Amount</th><th>Due Date</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{assignmentRows.map((assignment) => { const paid = paidByAssignment[assignment.id] ?? 0; const remaining = Math.max(0, Number(assignment.amount) - paid); return <tr key={assignment.id}><td><b>{assignment.fee_structure?.name ?? "Fee assignment"}</b>{assignment.notes && <><br /><small>{assignment.notes}</small></>}</td><td>{formatINR(Number(assignment.amount))}</td><td>{formatDate(assignment.due_date)}</td><td>{formatINR(paid)}</td><td><b>{formatINR(remaining)}</b></td><td><span className={`fee-badge badge-${assignment.status.toLowerCase()}`}>{formatStatus(assignment.status)}</span></td></tr>; })}</tbody></table></div>}</section>

        <section className="fee-section"><h2>Payment History</h2>{!paymentRows.length ? <div className="profile-empty">No successful payments have been recorded yet.</div> : <div className="data-table"><table><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Receipt</th><th>Reference</th></tr></thead><tbody>{paymentRows.map((payment) => <tr key={payment.id}><td>{formatDate(payment.paid_at)}</td><td><b>{formatINR(Number(payment.amount))}</b></td><td>{payment.payment_method.replaceAll("_", " ")}</td><td>{payment.receipt_number ?? "Not available"}</td><td>{payment.transaction_reference ?? "Not available"}</td></tr>)}</tbody></table></div>}</section>
      </div>
    </main>
  );
}