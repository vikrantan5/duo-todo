"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const redirectTo = `${location.origin}/auth/callback?next=/settings`;
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm card p-8 animate-fade-up">
        <Logo className="mb-6" />
        <h1 className="text-2xl font-display mb-1">Reset password</h1>
        {sent ? (
          <p className="muted text-sm">Check your inbox for the reset link.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 mt-4">
            <input className="input" type="email" placeholder="you@domain.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
