"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName, timezone: tz } }
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to verify, then sign in.");
    router.push("/login");
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
          Already have an account? <Link href="/login" className="text-ink hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
