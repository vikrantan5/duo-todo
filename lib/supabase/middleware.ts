import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;
  const isAuthRoute = ["/login", "/signup", "/forgot-password", "/reset-password"].some(p => path.startsWith(p));
  const isPublic = path === "/" || path.startsWith("/invite") || path.startsWith("/auth");
  // API handlers must receive the request so they can return JSON 401/403
  // responses. Redirecting them to HTML /login pages breaks fetch callers.
  const isApiRoute = path.startsWith("/api");
  const needsAuth = !isAuthRoute && !isPublic && !isApiRoute;

  if (!user && needsAuth) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && isAuthRoute) {
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return response;
}
