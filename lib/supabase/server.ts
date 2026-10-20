import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
         // Next 14 App Router caches GET fetches in its Data Cache even on dynamic
      // pages — a partner who joins mid-session would NEVER appear in
      // server-rendered duo data (stale cached rows). Bypass it: every Supabase
      // server fetch must hit PostgREST directly.
      global: {
          fetch: (...args: Parameters<typeof fetch>) =>
          fetch(args[0], { ...args[1], cache: "no-store" }),
      },
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove: (name: string, options: CookieOptions) => {
          try { cookieStore.set({ name, value: "", ...options }); } catch {}
        },
      },
    }
  );
}

/**
 * Admin client — SERVER ONLY. Bypasses RLS. Only use for trusted operations
 * (e.g. accepting invitations, seeding, verified webhooks).
 */
export function createAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
