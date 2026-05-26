import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath, isAuthPath } from "@/lib/auth/route-protection";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Unauthenticated hitting a protected route: send to login but
  // preserve where they were headed so we can return them after auth.
  if (isProtectedPath(path) && !user) {
    const dest = path + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect_to", dest);
    return NextResponse.redirect(url);
  }

  // Authenticated hitting an auth page: return to the saved destination
  // if it is a safe internal path, else the dashboard.
  if (isAuthPath(path) && user) {
    const safe = safeInternalPath(
      request.nextUrl.searchParams.get("redirect_to"),
    );
    if (safe) {
      return NextResponse.redirect(new URL(safe, request.nextUrl.origin));
    }
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
