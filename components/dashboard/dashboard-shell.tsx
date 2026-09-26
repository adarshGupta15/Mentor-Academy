"use client";

import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentIdentity } from "@/lib/auth/roles";

const navByRole = {
  ADMIN: ["Dashboard", "Students", "Teachers", "Classes", "Settings"],
  TEACHER: ["Overview", "My Classes", "My Students", "Profile"],
  STUDENT: ["Dashboard", "My Profile", "Fees"],
  PARENT: ["Dashboard"],
};

export function DashboardShell({ identity }: { identity: CurrentIdentity }) {
  const [open, setOpen] = useState(false);
  async function logout() { await createClient().auth.signOut(); window.location.assign("/"); }
  const nav = navByRole[identity.role];
  return <div className="dashboard"><aside className={open ? "dash-sidebar open" : "dash-sidebar"}><Link href="/" className="dash-brand"><span className="dash-mark">△</span><b>MENTOR<br/><small>ACADEMY</small></b></Link><p className="role-label">{identity.role} PORTAL</p><nav>{nav.map((item, index) => <a className={index === 0 ? "active" : ""} href={identity.role === "STUDENT" && item === "My Profile" ? "/student/profile" : identity.role === "STUDENT" && item === "Fees" ? "/student/fees" : "#"} key={item}>{item}</a>)}</nav><button onClick={logout} className="logout"><LogOut size={17}/> Logout</button></aside><main className="dash-content"><header><button className="dash-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button><div><p>WELCOME BACK</p><h1>{identity.name}</h1></div><span className="identity-dot">{identity.name.slice(0,1).toUpperCase()}</span></header><section className="dash-placeholder"><span>PHASE 2 FOUNDATION</span><h2>Your {identity.role.toLowerCase()} workspace is ready.</h2><p>Authentication, secure session handling and role access control are now in place. Your Phase 3 dashboard features will appear here.</p></section></main></div>;
}

