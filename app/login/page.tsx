"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    router.push("/today");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm card p-8 shadow-soft animate-fade-up">
        <Logo className="mb-6" />
        <h1 className="text-2xl font-display mb-1">Welcome back</h1>
        <p className="muted text-sm mb-6">Sign in to meet your partner.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="input" type="email" placeholder="you@domain.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="flex items-center justify-between text-sm mt-4 muted">
          <Link href="/forgot-password" className="hover:underline">Forgot password?</Link>
          <Link href="/signup" className="hover:underline">Create account</Link>
        </div>
      </div>
    </main>
  );
}
