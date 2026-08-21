import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/utils/session-config";
import { EMPLOYEES } from "@/constants/employees";
import { ActiveSessionStore } from "@/utils/session-store";

/**
 * POST /api/auth/login
 *
 * Accepts: { employeeId: string, password: string }
 * Returns: { success: true, employee: {...} } or { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const { employeeId, password } = body || {};

    if (!employeeId || !password) {
      return NextResponse.json(
        { success: false, error: "Employee ID and password are required" },
        { status: 400 }
      );
    }

    const trimmedId = employeeId.trim();

    // Check if Supabase service role key is configured
    const hasSupabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== "YOUR_SERVICE_ROLE_KEY_HERE";

    if (hasSupabaseServiceKey) {
      try {
        const cookieStore = await cookies();
        const supabase = createAdminClient(cookieStore);

        // Step 1: Verify credentials via Supabase RPC
        const { data: employees, error: verifyError } = await supabase.rpc(
          "verify_employee",
          {
            p_employee_id: trimmedId,
            p_password: password,
          }
        );

        if (!verifyError && employees && employees.length > 0) {
          const employee = employees[0];
          const deviceInfo = request.headers.get("user-agent") || "Unknown Device";
          const forwardedFor = request.headers.get("x-forwarded-for");
          const ipAddress = forwardedFor
            ? forwardedFor.split(",")[0].trim()
            : request.headers.get("x-real-ip") || null;

          const { data: sessionKey } = await supabase.rpc("create_session", {
            p_employee_uuid: employee.id,
            p_device_info: deviceInfo.substring(0, 500),
            p_ip_address: ipAddress,
          });

          if (sessionKey) {
            ActiveSessionStore.setActiveSession(employee.employee_id, sessionKey);
            const response = NextResponse.json({
              success: true,
              employee: {
                id: employee.id,
                employeeId: employee.employee_id,
                name: employee.name,
                position: employee.position,
                program: employee.program,
              },
            });
            response.cookies.set(SESSION_COOKIE_NAME, sessionKey, SESSION_COOKIE_OPTIONS);
            return response;
          }
        }
      } catch (e) {
        console.warn("[Login] Supabase unavailable, falling back to local verification:", e);
      }
    }

    // Fallback: Verify against static EMPLOYEES list
    const foundEmployee = EMPLOYEES.find(
      (emp) =>
        emp.employeeId.toLowerCase() === trimmedId.toLowerCase() &&
        emp.password === password
    );

    if (!foundEmployee) {
      return NextResponse.json(
        { success: false, error: "Invalid Employee ID or password" },
        { status: 401 }
      );
    }

    // Create session token with encoded employee ID
    const localSessionKey = `local_${Buffer.from(foundEmployee.employeeId).toString("base64")}_${Date.now()}`;
    ActiveSessionStore.setActiveSession(foundEmployee.employeeId, localSessionKey);

    const response = NextResponse.json({
      success: true,
      employee: {
        id: foundEmployee.employeeId,
        employeeId: foundEmployee.employeeId,
        name: foundEmployee.name,
        position: foundEmployee.position,
        program: foundEmployee.program,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, localSessionKey, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error("[Login] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
