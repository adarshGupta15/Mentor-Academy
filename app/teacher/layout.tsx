import { requireRole } from "@/lib/auth/server";
import { TeacherShell } from "@/components/dashboard/teacher-shell";

export default async function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const identity = await requireRole("TEACHER");
	return <TeacherShell identity={identity}>{children}</TeacherShell>;
}
