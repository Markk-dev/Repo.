import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/utils/session-config";
import { ActiveSessionStore } from "@/utils/session-store";

/**
 * POST /api/auth/logout
 *
 * Revokes the current session in the database and clears the cookie.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionKey = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionKey) {
      if (sessionKey.startsWith("local_")) {
        try {
          const parts = sessionKey.split("_");
          const empId = Buffer.from(parts[1], "base64").toString("utf-8");
          ActiveSessionStore.invalidateSession(empId);
        } catch {
          // ignore
        }
      }

      const supabase = createAdminClient(cookieStore);

      // Revoke session in the database
      const { error } = await supabase.rpc("revoke_session", {
        p_session_key: sessionKey,
      });

      if (error) {
        console.error("[Logout] revoke_session error:", error);
        // Continue with cookie deletion even if DB revoke fails
      }
    }

    // Clear the session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0, // Delete immediately
    });

    return response;
  } catch (err) {
    console.error("[Logout] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
