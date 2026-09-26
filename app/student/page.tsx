import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/server";
export default async function StudentPage() { return <DashboardShell identity={await requireRole("STUDENT")} />; }
