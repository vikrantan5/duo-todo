"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export default function SettingsView({ profile, duoId }: { profile: Profile; duoId: string }) {
  const supabase = createClient();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [accent, setAccent] = useState(profile.accent_color);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function save() {
    const { error } = await supabase.from("profiles")
      .update({ display_name: displayName, accent_color: accent }).eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  }

  async function newInvite() {
    const res = await fetch("/api/invitations", { method: "POST", body: JSON.stringify({ duo_id: duoId }) });
    const payload = await res.json();
    if (!res.ok) return toast.error(payload.error);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://duo-todo-chi.vercel.app";
    setInviteLink(`${appUrl.replace(/\/$/, "")}/invite/${payload.token}`);
  }

  return (
    <div className="space-y-5 max-w-xl">
      <h1 className="font-display text-2xl">Settings</h1>
      <div className="card p-5 space-y-3">
        <div className="font-semibold">Profile</div>
        <label className="text-sm muted">Display name</label>
        <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        <label className="text-sm muted">Accent color</label>
        <div className="flex gap-2">
          {["#8B7CFF","#43D9A3","#F6BD60","#FF6B7A","#60A5FA","#F472B6"].map(c => (
            <button key={c} onClick={() => setAccent(c)}
              className="h-8 w-8 rounded-full border-2"
              style={{ background: c, borderColor: accent === c ? "#F5F7FB" : "transparent" }} />
          ))}
        </div>
        <button className="btn btn-primary" onClick={save}>Save</button>
      </div>

      <div className="card p-5 space-y-3">
        <div className="font-semibold">Invite a partner</div>
        <p className="muted text-sm">Only used if your Duo has an open seat.</p>
        <button className="btn btn-ghost" onClick={newInvite}>Generate new invite link</button>
        {inviteLink && (
          <div className="elev p-3 flex items-center justify-between gap-2">
            <code className="text-xs truncate">{inviteLink}</code>
            <button onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success("Copied"))} className="btn btn-ghost"><Copy size={14}/> Copy</button>
          </div>
        )}
      </div>
    </div>
  );
}
