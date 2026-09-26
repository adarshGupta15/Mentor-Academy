"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { saveSettings } from "@/lib/admin/actions";

type Settings = {
  academy_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
};

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [academyName, setAcademyName] = useState(settings?.academy_name ?? "");
  const [address, setAddress] = useState(settings?.address ?? "");
  const [phone, setPhone] = useState(settings?.phone ?? "");
  const [email, setEmail] = useState(settings?.email ?? "");
  const [website, setWebsite] = useState(settings?.website ?? "");
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await saveSettings(formData);
        setSuccess("Settings saved successfully.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save settings.");
      }
    });
  }

  return (
    <>
      {error && <div className="alert-box alert-error" role="alert" style={{ display: "flex", gap: "8px", alignItems: "center" }}><AlertCircle size={16} /><span>{error}</span></div>}
      {success && <div className="alert-box alert-success" role="status" style={{ display: "flex", gap: "8px", alignItems: "center" }}><CheckCircle2 size={16} /><span>{success}</span></div>}
      <form action={handleSubmit} className="form-grid settings-form">
        <label>Academy Name<input name="academyName" value={academyName} onChange={(event) => setAcademyName(event.target.value)} maxLength={160} required disabled={isPending} /></label>
        <label>Phone<input name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={500} disabled={isPending} /></label>
        <label>Email<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isPending} /></label>
        <label>Website<input name="website" type="url" value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={500} placeholder="https://" disabled={isPending} /></label>
        <label className="settings-wide-field">Address<textarea name="address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} rows={4} disabled={isPending} /></label>
        <label className="settings-wide-field">Logo URL<input name="logoUrl" type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} maxLength={500} placeholder="https://" disabled={isPending} /></label>
        <button type="submit" className="button primary settings-save" disabled={isPending}><Save size={16} />{isPending ? "Saving Settings..." : "Save Settings"}</button>
      </form>
    </>
  );
}