import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/server";
export default async function TeacherPage() { return <DashboardShell identity={await requireRole("TEACHER")} />; }
