import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/utils/session-config";
import { EMPLOYEES } from "@/constants/employees";
import { ActiveSessionStore } from "@/utils/session-store";

/**
 * GET /api/auth/session
 *
 * Checks the current session status.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionKey = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionKey) {
      return NextResponse.json(
        { authenticated: false, error: "No session" },
        { status: 401 }
      );
    }

    // Check if it's a local fallback session
    if (sessionKey.startsWith("local_")) {
      try {
        const parts = sessionKey.split("_");
        const empId = Buffer.from(parts[1], "base64").toString("utf-8");

        // Enforce single-device active session rule
        if (!ActiveSessionStore.isActiveSession(empId, sessionKey)) {
          return NextResponse.json(
            { authenticated: false, sessionOverridden: true, error: "You have been logged out because this account was logged into on another device." },
            { status: 401 }
          );
        }

        const employee = EMPLOYEES.find((emp) => emp.employeeId === empId);

        if (employee) {
          return NextResponse.json({
            authenticated: true,
            employee: {
              id: employee.employeeId,
              employeeId: employee.employeeId,
              name: employee.name,
              position: employee.position,
              program: employee.program,
            },
          });
        }
      } catch (e) {
        console.error("[Session] Error parsing local session:", e);
      }
    }

    const hasSupabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== "YOUR_SERVICE_ROLE_KEY_HERE";

    if (hasSupabaseServiceKey) {
      try {
        const supabase = createAdminClient(cookieStore);
        const { data, error } = await supabase.rpc("validate_session", {
          p_session_key: sessionKey,
        });

        if (!error && data && data.length > 0) {
          const session = data[0];

          if (
            session.status === "invalid" ||
            session.status === "expired" ||
            !ActiveSessionStore.isActiveSession(session.emp_employee_id, sessionKey)
          ) {
            return NextResponse.json(
              { authenticated: false, sessionOverridden: true, error: "You have been logged out because this account was logged into on another device." },
              { status: 401 }
            );
          }

          const responseBody = {
            authenticated: true,
            employee: {
              id: session.emp_id,
              employeeId: session.emp_employee_id,
              name: session.emp_name,
              position: session.emp_position,
              program: session.emp_program,
            },
          };

          const response = NextResponse.json(responseBody);

          if (session.status === "rotated" && session.new_session_key) {
            ActiveSessionStore.setActiveSession(session.emp_employee_id, session.new_session_key);
            response.cookies.set(
              SESSION_COOKIE_NAME,
              session.new_session_key,
              SESSION_COOKIE_OPTIONS
            );
          }

          return response;
        }
      } catch (e) {
        console.warn("[Session] Supabase session check error:", e);
      }
    }

    return NextResponse.json(
      { authenticated: false, error: "Invalid session" },
      { status: 401 }
    );
  } catch (err) {
    console.error("[Session] Unexpected error:", err);
    return NextResponse.json(
      { authenticated: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
