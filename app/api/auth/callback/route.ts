import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/utils/supabase/admin";
import { SESSION_COOKIE_NAME } from "@/utils/session-config";
import { EMPLOYEES } from "@/constants/employees";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Determine correct public browser origin
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const proto = request.headers.get("x-forwarded-proto") || (requestUrl.protocol.replace(":", "") || "http");
  let origin = `${proto}://${host}`;

  // Sanitize 0.0.0.0 binding to localhost so browser doesn't throw ERR_ADDRESS_INVALID
  if (origin.includes("0.0.0.0")) {
    origin = origin.replace(/0\.0\.0\.0/g, "localhost");
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // ignore in route handler
        }
      },
    },
  });

  // Exchange auth code for Supabase Google user session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[OAuth Callback] Code exchange failed:", error);
    return NextResponse.redirect(`${origin}/?error=oauth_failed`);
  }

  const googleEmail = data.user.email;
  const googleUserId = data.user.id;

  // Resolve current logged-in employee from session cookie
  const sessionKey = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  let employeeUuid: string | null = null;

  if (sessionKey) {
    const admin = createAdminClient(cookieStore);

    // 1. Try Supabase user_sessions lookup
    try {
      const { data: sessionData } = await admin
        .from("user_sessions")
        .select("employee_id, employees!inner(id, employee_id)")
        .eq("session_key", sessionKey)
        .eq("is_valid", true)
        .maybeSingle();

      if (sessionData && sessionData.employees) {
        const emp = Array.isArray(sessionData.employees)
          ? sessionData.employees[0]
          : sessionData.employees;
        employeeUuid = emp.id;
      }
    } catch {
      // ignore
    }

    // 2. Fall back to local session cookie format -> resolve employee UUID from database
    if (!employeeUuid && sessionKey.startsWith("local_")) {
      try {
        const parts = sessionKey.split("_");
        const empCode = Buffer.from(parts[1], "base64").toString("utf-8");
        const { data: empData } = await admin
          .from("employees")
          .select("id")
          .eq("employee_id", empCode)
          .maybeSingle();

        if (empData) {
          employeeUuid = empData.id;
        }
      } catch (e) {
        console.warn("[OAuth Callback] Error resolving employee UUID:", e);
      }
    }
  }

  // If an employee session exists, link the Google account in database
  if (employeeUuid && googleEmail) {
    const admin = createAdminClient(cookieStore);

    try {
      const { error: linkErr } = await admin.from("linked_accounts").upsert(
        {
          employee_id: employeeUuid,
          provider: "google",
          provider_account_id: googleUserId,
          email: googleEmail,
          is_verified: true,
          linked_at: new Date().toISOString(),
        },
        { onConflict: "employee_id,provider" }
      );
      if (linkErr) {
        console.error("[OAuth Callback] Upsert error:", linkErr);
      }
    } catch (e) {
      console.warn("[OAuth Callback] Could not upsert into linked_accounts:", e);
    }
  }

  return NextResponse.redirect(`${origin}/?settings=open&google_connected=true`);
}
