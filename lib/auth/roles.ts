export const roles = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
export type Role = (typeof roles)[number];

export type CurrentIdentity = { id: string; name: string; email: string; role: Role };

export const dashboardForRole: Record<Role, string> = {
  ADMIN: "/admin", TEACHER: "/teacher", STUDENT: "/student", PARENT: "/parent",
};

export function normaliseLoginIdentifier(identifier: string) {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@students.mentoracademy.local`;
}
