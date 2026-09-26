import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardForRole, type CurrentIdentity, type Role } from "./roles";

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, email")
    .eq("user_id", user.id)
    .single();
  if (!profile) return null;
  return { id: user.id, name: profile.name, email: profile.email, role: profile.role as Role };
}

export async function requireRole(role: Role) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login");
  if (identity.role !== role) redirect(dashboardForRole[identity.role]);
  return identity;
}
