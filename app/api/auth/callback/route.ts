import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/utils/supabase/admin";
import { SESSION_COOKIE_NAME } from "@/utils/session-config";
import { EMPLOYEES } from "@/constants/employees";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

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
  let employeeId: string | null = null;

  if (sessionKey) {
    const admin = createAdminClient(cookieStore);

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
        employeeId = emp.id;
      }
    } catch {
      // ignore
    }

    if (!employeeId && sessionKey.startsWith("local_")) {
      try {
        const parts = sessionKey.split("_");
        const empCode = Buffer.from(parts[1], "base64").toString("utf-8");
        const emp = EMPLOYEES.find((e) => e.employeeId === empCode);
        if (emp) {
          employeeId = emp.employeeId;
        }
      } catch {
        // ignore
      }
    }
  }

  // If an employee session exists, link the Google account in database
  if (employeeId && googleEmail) {
    const admin = createAdminClient(cookieStore);

    try {
      await admin.from("linked_accounts").upsert(
        {
          employee_id: employeeId,
          provider: "google",
          provider_account_id: googleUserId,
          email: googleEmail,
          is_verified: true,
          linked_at: new Date().toISOString(),
        },
        { onConflict: "employee_id,provider" }
      );
    } catch (e) {
      console.warn("[OAuth Callback] Could not upsert into linked_accounts:", e);
    }
  }

  return NextResponse.redirect(`${origin}/?settings=open&google_connected=true`);
}
