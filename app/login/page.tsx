import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { ArrowLeft, GraduationCap } from "lucide-react";

export default function LoginPage() {
  return <main className="login-page"><Link href="/" className="login-back"><ArrowLeft size={17}/> Back to Mentor Academy</Link><section className="login-panel"><div className="login-intro"><div className="login-mark">△</div><p className="eyebrow">MENTOR ACADEMY PORTAL</p><h1>Welcome back to<br/><em>your learning space.</em></h1><p>Sign in to access your academic information, classes and updates.</p><div className="portal-note"><GraduationCap size={18}/><span>Access is securely tailored to your<br/>Mentor Academy role.</span></div></div><div className="login-card"><p className="eyebrow">SECURE SIGN IN</p><h2>Continue to portal</h2><LoginForm /></div></section></main>;
}

