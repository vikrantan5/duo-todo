"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

/** Human-readable messages for the known accept failures. */
function friendlyError(message: string | undefined): string {
  const m = (message || "").toLowerCase();
  if (m.includes("already belong")) {
    return "You are already part of a Duo. Open Duo Todo to continue — or leave that Duo from Settings first.";
  }
  if (m.includes("own invite")) {
    return "That is your own invite — share the link with your partner instead.";
  }
  if (m.includes("invalid") || m.includes("expire")) {
    return "This invite link is invalid, expired, or already used. Ask your partner for a fresh link from Settings.";
  }
  if (m.includes("full")) {
    return "That Duo already has two members.";
  }
  return message || "Could not accept invitation";
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const invitePath = `/invite/${params.token}`;

  useEffect(() => {
    let alive = true;
    createClient().auth.getUser().then(({ data }) => {
      if (!alive) return;
      setSignedIn(!!data.user);
      setChecking(false);
    });
    return () => { alive = false; };
  }, []);

  async function accept() {
    setLoading(true);
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token: params.token }),
    });
    const payload = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (res.status === 401) {
        // Session lost mid-flow — rebuild it, keeping the invite context.
        setSignedIn(false);
        return toast.error("Please sign in to accept this invite.");
      }
      return toast.error(friendlyError(payload.error));
    }

    setDone(true);
    toast.success("You're in! Welcome to your Duo.");
    router.replace("/today");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md card p-8 animate-fade-up shadow-soft">
        <Logo className="mb-6" />
        {checking ? (
          <p className="muted text-sm">Checking your session…</p>
        ) : done ? (
          <>
            <h1 className="text-2xl font-display mb-1">You've joined the Duo!</h1>
            <p className="muted text-sm mb-6">Taking you to your shared dashboard…</p>
            <Link href="/today" className="btn btn-primary w-full">Go to Today</Link>
          </>
        ) : !signedIn ? (
          <>
            <h1 className="text-2xl font-display mb-1">You've been invited</h1>
            <p className="muted text-sm mb-6">
              Sign in (or create an account) first — you'll come straight back here to join your partner's Duo.
            </p>
            <div className="space-y-3">
              <Link href={`/login?next=${encodeURIComponent(invitePath)}`} className="btn btn-primary w-full">
                Sign in to accept
              </Link>
              <Link href={`/signup?next=${encodeURIComponent(invitePath)}`} className="btn btn-ghost w-full">
                Create an account
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-display mb-1">You've been invited</h1>
            <p className="muted text-sm mb-6">Join your partner's Duo to share goals, streaks, and daily progress.</p>
            <button className="btn btn-primary w-full" onClick={accept} disabled={loading}>
              {loading ? "Joining…" : "Accept invitation"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
