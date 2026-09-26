"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normaliseLoginIdentifier } from "@/lib/auth/roles";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normaliseLoginIdentifier(identifier), password,
    });
    if (authError) { setError("We could not sign you in. Check your details and try again."); setLoading(false); return; }
    window.location.assign("/auth/callback");
  }

  return <form className="login-form" onSubmit={submit}>
    <label>Student ID or email<input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. MA-2026-001 or you@email.com" autoComplete="username" /></label>
    <label>Password<div className="password-field"><input required value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary login-submit" disabled={loading}>{loading ? "Signing in…" : <>Sign in securely <ArrowRight size={18}/></>}</button>
    <p className="login-help"><LockKeyhole size={14}/> Your access is assigned by Mentor Academy. Contact the office if you need help signing in.</p>
  </form>;
}
