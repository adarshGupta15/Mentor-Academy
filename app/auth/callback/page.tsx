import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { dashboardForRole } from "@/lib/auth/roles";

export default async function AuthCallback() {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login");
  redirect(dashboardForRole[identity.role]);
}
