"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Copy, Users, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [accent, setAccent] = useState("#8B7CFF");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      const { data } = await supabase.from("profiles").select("display_name,accent_color").eq("id", user.id).maybeSingle();
      setDisplayName(data?.display_name || "");
      setAccent(data?.accent_color || "#8B7CFF");
      const { data: m } = await supabase.from("duo_members").select("duo_id").eq("user_id", user.id).eq("active", true).maybeSingle();
      if (m) router.replace("/today");
    })();
  }, [router, supabase]);

  async function createDuo() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    await supabase.from("profiles").update({ display_name: displayName, accent_color: accent }).eq("id", user.id);

    const { data: duo, error: dErr } = await supabase.from("duos").insert({ name: `${displayName}'s Duo`, created_by: user.id }).select().single();
    if (dErr || !duo) { setLoading(false); return toast.error(dErr?.message || "Could not create duo"); }

    const { error: mErr } = await supabase.from("duo_members").insert({ duo_id: duo.id, user_id: user.id, role: "owner" });
    if (mErr) { setLoading(false); return toast.error(mErr.message); }

    // Create invitation via API (server generates token + hash)
    const res = await fetch("/api/invitations", { method: "POST", body: JSON.stringify({ duo_id: duo.id }) });
    const payload = await res.json();
    setLoading(false);
    if (!res.ok) return toast.error(payload.error || "Could not create invitation");

    setInviteLink(`${location.origin}/invite/${payload.token}`);
  }

  async function copy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied");
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-lg card p-8 shadow-soft animate-fade-up">
        <Logo className="mb-6" />
        <h1 className="text-2xl font-display mb-1">Set up your Duo</h1>
        <p className="muted text-sm mb-6">Pick a name and accent — then invite your partner.</p>

        <label className="text-sm muted">Display name</label>
        <input className="input mt-1 mb-4" value={displayName} onChange={e => setDisplayName(e.target.value)} />

        <label className="text-sm muted">Accent color</label>
        <div className="flex gap-2 mt-2 mb-6">
          {["#8B7CFF","#43D9A3","#F6BD60","#FF6B7A","#60A5FA","#F472B6"].map(c => (
            <button key={c} onClick={() => setAccent(c)}
              className="h-8 w-8 rounded-full border-2 transition"
              style={{ background: c, borderColor: accent === c ? "#F5F7FB" : "transparent" }} />
          ))}
        </div>

        {!inviteLink ? (
          <button className="btn btn-primary w-full" disabled={loading || !displayName}
            onClick={createDuo}>
            <Users size={16} /> {loading ? "Creating…" : "Create Duo & invite partner"}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="elev p-3 flex items-center justify-between gap-2">
              <code className="text-xs truncate">{inviteLink}</code>
              <button onClick={copy} className="btn btn-ghost"><Copy size={14} /> Copy</button>
            </div>
            <p className="text-sm muted flex items-start gap-2">
              <Sparkles size={16} className="mt-0.5 shrink-0" />
              Share with your partner. The invite expires in 7 days and can only be used once.
            </p>
            <button className="btn btn-primary w-full" onClick={() => router.push("/today")}>
              Enter Duo Todo
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
