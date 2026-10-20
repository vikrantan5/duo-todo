"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

/** Only allow same-app relative redirects (no open redirects). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/today";
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName, timezone: tz } }
    });
    setLoading(false);
     if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("rate limit") || m.includes("too many")) {
        return toast.error("Email send limit reached — try again in about an hour, or use a different address.");
      }
      if (m.includes("invalid")) {
        return toast.error("That email address is not accepted. Please use a real email address.");
      }
      return toast.error(error.message);
    }

    // Email confirmation disabled: a session comes straight back — continue to
    // the invite/onboarding immediately. Otherwise keep the invite context
    // alive by passing `next` through to the login screen.
    if (data?.session) {
      router.push(next);
      router.refresh();
    } else {
      toast.success("Check your email to verify, then sign in.");
      router.push(`/login?next=${encodeURIComponent(next)}`);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm card p-8 animate-fade-up shadow-soft">
        <Logo className="mb-6" />
        <h1 className="text-2xl font-display mb-1">Create your account</h1>
        <p className="muted text-sm mb-6">Then invite your accountability partner.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="input" placeholder="Display name"
            value={displayName} onChange={e => setDisplayName(e.target.value)} required />
          <input className="input" type="email" placeholder="you@domain.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password (min 8)"
            value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="text-sm mt-4 muted">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
