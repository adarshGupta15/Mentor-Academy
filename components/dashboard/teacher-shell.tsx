"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, Users, UserRound, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentIdentity } from "@/lib/auth/roles";

const links = [
  { label: "Overview", href: "/teacher", icon: LayoutDashboard },
  { label: "My Classes", href: "/teacher/classes", icon: BookOpen },
  { label: "My Students", href: "/teacher/students", icon: Users },
  { label: "Tests", href: "/teacher/tests", icon: ClipboardList },
  { label: "Marks", href: "/teacher/marks", icon: GraduationCap },
  { label: "Profile", href: "/teacher/profile", icon: UserRound },
];

export function TeacherShell({ identity, children }: { identity: CurrentIdentity; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    window.location.assign("/");
  }

  return (
    <div className="dashboard teacher-dashboard">
      <aside className={open ? "dash-sidebar open" : "dash-sidebar"}>
        <Link href="/" className="dash-brand"><span className="dash-mark">△</span><b>MENTOR<br /><small>ACADEMY</small></b></Link>
        <p className="role-label">TEACHER PORTAL</p>
        <nav aria-label="Teacher navigation">
          {links.map(({ label, href, icon: Icon }) => (
            <Link className={pathname === href || (href !== "/teacher" && pathname.startsWith(`${href}/`)) ? "active" : ""} href={href} key={href} onClick={() => setOpen(false)}>
              <Icon size={17} />{label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="logout"><LogOut size={17} /> Logout</button>
      </aside>
      <main className="dash-content">
        <header>
          <button className="dash-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
          <div><p>WELCOME BACK</p><h1>{identity.name}</h1></div>
          <span className="identity-dot">{identity.name.slice(0, 1).toUpperCase()}</span>
        </header>
        <div className="teacher-content">{children}</div>
      </main>
    </div>
  );
}