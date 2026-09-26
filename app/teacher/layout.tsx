import { requireRole } from "@/lib/auth/server";
export default async function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) { await requireRole("TEACHER"); return children; }
