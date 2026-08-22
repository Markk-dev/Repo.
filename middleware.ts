import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  PUBLIC_PATHS,
} from "@/utils/session-config";

/**
 * Middleware: Runs on every request (except static files).
 *
 * - Public paths (/login, /api/auth/login) → pass through
 * - API routes → check for session cookie, reject if missing
 * - Protected pages → check for session cookie, redirect to /login if missing
 *
 * The actual session validation (rotation, expiry check) happens in the
 * /api/auth/session endpoint and is called by the AuthContext on mount.
 * Middleware only does a quick cookie-existence check to avoid
 * unnecessary server-side RPC calls on every static asset request.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie
  const sessionKey = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // If user is already logged in and tries to access /login, redirect straight to dashboard (/)
  if (sessionKey && (pathname === "/login" || pathname.startsWith("/login/"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow all other API auth routes (logout, session check)
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (!sessionKey) {
    // API requests get a 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Page requests get redirected to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists — let the request through
  // Full validation happens via /api/auth/session (called by AuthContext)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
