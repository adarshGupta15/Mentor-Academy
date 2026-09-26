import { requireRole } from "@/lib/auth/server";
export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) { await requireRole("STUDENT"); return children; }
