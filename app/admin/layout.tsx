import { requireRole } from "@/lib/auth/server";
import { AdminShell } from "@/components/admin/admin-shell";
export default async function AdminLayout({children}:Readonly<{children:React.ReactNode}>){const identity=await requireRole("ADMIN");return <AdminShell identity={identity}>{children}</AdminShell>}
