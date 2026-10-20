"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token: params.token })
    });
    const payload = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) { toast.error("Please sign in to accept."); return router.push(`/login?next=/invite/${params.token}`); }
      return toast.error(payload.error || "Could not accept invitation");
    }
    toast.success("You're in! Welcome to your Duo.");
    router.push("/today");
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md card p-8 animate-fade-up shadow-soft">
        <Logo className="mb-6" />
        <h1 className="text-2xl font-display mb-1">You've been invited</h1>
        <p className="muted text-sm mb-6">Join your partner's Duo to share goals, streaks, and daily progress.</p>
        <button className="btn btn-primary w-full" onClick={accept} disabled={loading}>
          {loading ? "Joining…" : "Accept invitation"}
        </button>
      </div>
    </main>
  );
}
