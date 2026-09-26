import { createClient } from "@/lib/supabase/server";
import { NoticeForm, NoticeList } from "./notices-client";

type Notice = {
  id: string;
  title: string;
  description: string;
  audience: "ALL" | "STUDENTS" | "TEACHERS" | "PARENTS";
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

export default async function NoticesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notices").select("id, title, description, audience, is_published, published_at, created_at").order("created_at", { ascending: false });
  const notices = (data ?? []) as Notice[];

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>ACADEMY COMMUNICATIONS</span>
        <h2>Notice Management</h2>
        <p>Create and manage announcements for students, teachers and parents.</p>
      </div>
      {error && <div className="alert-box alert-error" role="alert">Unable to load notices. Please try again later.</div>}
      <details open><summary>Create Notice</summary><NoticeForm /></details>
      <div><h3 className="section-label">Existing Notices</h3><NoticeList notices={notices} /></div>
    </section>
  );
}