"use client";

import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentIdentity } from "@/lib/auth/roles";

const navByRole = {
  ADMIN: [{ label: "Dashboard", href: "/admin" }, { label: "Students", href: "/admin/students" }, { label: "Teachers", href: "/admin/teachers" }, { label: "Classes", href: "/admin/classes" }, { label: "Settings", href: "/admin/settings" }],
  TEACHER: [{ label: "Overview", href: "/teacher" }, { label: "My Classes", href: "/teacher/classes" }, { label: "My Students", href: "/teacher/students" }, { label: "Tests", href: "/teacher/tests" }, { label: "Marks", href: "/teacher/marks" }, { label: "Profile", href: "/teacher/profile" }],
  STUDENT: [{ label: "Dashboard", href: "/student" }, { label: "My Profile", href: "/student/profile" }, { label: "Fees", href: "/student/fees" }],
  PARENT: [{ label: "Dashboard", href: "/parent" }],
};

export function DashboardShell({ identity }: { identity: CurrentIdentity }) {
  const [open, setOpen] = useState(false);
  async function logout() { await createClient().auth.signOut(); window.location.assign("/"); }
  const nav = navByRole[identity.role];
  return <div className="dashboard"><aside className={open ? "dash-sidebar open" : "dash-sidebar"}><Link href="/" className="dash-brand"><span className="dash-mark">△</span><b>MENTOR<br/><small>ACADEMY</small></b></Link><p className="role-label">{identity.role} PORTAL</p><nav>{nav.map((item, index) => <Link className={index === 0 ? "active" : ""} href={item.href} key={item.href}>{item.label}</Link>)}</nav><button onClick={logout} className="logout"><LogOut size={17}/> Logout</button></aside><main className="dash-content"><header><button className="dash-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button><div><p>WELCOME BACK</p><h1>{identity.name}</h1></div><span className="identity-dot">{identity.name.slice(0,1).toUpperCase()}</span></header><section className="dash-placeholder"><span>PHASE 2 FOUNDATION</span><h2>Your {identity.role.toLowerCase()} workspace is ready.</h2><p>Authentication, secure session handling and role access control are now in place. Your Phase 3 dashboard features will appear here.</p></section></main></div>;
}

