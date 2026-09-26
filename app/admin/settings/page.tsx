import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

type Settings = {
  academy_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  updated_at: string;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academy_settings")
    .select("academy_name, address, phone, email, website, logo_url, updated_at")
    .eq("id", true)
    .maybeSingle();
  const settings = data as Settings | null;

  return (
    <section className="manage">
      <div className="admin-hero">
        <span>ACADEMY PROFILE</span>
        <h2>Academy Settings</h2>
        <p>Manage the basic information displayed across Mentor Academy.</p>
      </div>
      {error && <div className="alert-box alert-error" role="alert">Unable to load academy settings. Please try again later.</div>}
      {!settings && !error && <div className="alert-box" role="status">No settings have been saved yet. Complete the form below to create the academy profile.</div>}
      <div className="settings-panel"><SettingsForm settings={settings} /></div>
    </section>
  );
}