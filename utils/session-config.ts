/**
 * Session configuration constants.
 * Centralized so middleware, API routes, and context all share the same values.
 */

/** Cookie name for the session key */
export const SESSION_COOKIE_NAME = "brewcode_session";

/** Max age for the session cookie (7 days in seconds) */
export const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 604800

/** Paths that don't require authentication */
export const PUBLIC_PATHS = ["/login", "/api/auth/login"];

/** Cookie options for the session cookie */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_COOKIE_MAX_AGE,
};
