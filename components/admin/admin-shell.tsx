"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentIdentity } from "@/lib/auth/roles";
const links=[['Dashboard','/admin'],['Students','/admin/students'],['Teachers','/admin/teachers'],['Classes','/admin/classes'],['Subjects','/admin/subjects'],['Class Subjects','/admin/class-subjects'],['Batches','/admin/batches'],['Tests','/admin/tests'],['Fees','/admin/fees'],['Notices','/admin/notices'],['Settings','/admin/settings']];
export function AdminShell({identity,children}:{identity:CurrentIdentity;children:React.ReactNode}){const [open,setOpen]=useState(false);const path=usePathname();const isActive=(href:string)=>href==='/admin'?path===href:path.startsWith(href);async function logout(){await createClient().auth.signOut();window.location.assign('/');}return <div className="dashboard"><aside className={open?'dash-sidebar open':'dash-sidebar'}><Link href="/" className="dash-brand"><span className="dash-mark">△</span><b>MENTOR<br/><small>ACADEMY</small></b></Link><p className="role-label">ADMIN PORTAL</p><nav>{links.map(([label,href])=><Link className={isActive(href)?'active':''} href={href} key={href}>{label}</Link>)}</nav><button onClick={logout} className="logout"><LogOut size={17}/>Logout</button></aside><main className="dash-content admin-content"><header><button className="dash-menu" onClick={()=>setOpen(!open)} aria-label="Toggle menu">{open?<X/>:<Menu/>}</button><div><p>ADMINISTRATION</p><h1>{identity.name}</h1></div><span className="identity-dot">{identity.name.slice(0,1)}</span></header>{children}</main></div>}
