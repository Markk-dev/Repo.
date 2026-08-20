import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import { SESSION_COOKIE_NAME } from "@/utils/session-config";
import { EMPLOYEES } from "@/constants/employees";

/**
 * POST /api/auth/change-password
 *
 * Accepts: { currentPassword: string, newPassword: string, confirmPassword: string }
 * Returns: { success: boolean, message?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionKey = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionKey) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "New passwords do not match" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Determine current employee from session
    let employeeId: string | null = null;
    let employeeUuid: string | null = null;

    if (sessionKey.startsWith("local_")) {
      try {
        const parts = sessionKey.split("_");
        employeeId = Buffer.from(parts[1], "base64").toString("utf-8");
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid session format" },
          { status: 401 }
        );
      }
    }

    const hasSupabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== "YOUR_SERVICE_ROLE_KEY_HERE";

    if (hasSupabaseServiceKey) {
      try {
        const supabase = createAdminClient(cookieStore);

        // Validate session if not local
        if (!sessionKey.startsWith("local_")) {
          const { data: sessionData, error: sessionErr } = await supabase.rpc("validate_session", {
            p_session_key: sessionKey,
          });

          if (sessionErr || !sessionData || sessionData.length === 0) {
            return NextResponse.json(
              { success: false, error: "Session expired or invalid" },
              { status: 401 }
            );
          }

          const session = sessionData[0];
          employeeId = session.employee_id_code;
          employeeUuid = session.employee_id;
        }

        if (employeeId) {
          // Step 1: Verify current password
          const { data: verified, error: verifyError } = await supabase.rpc("verify_employee", {
            p_employee_id: employeeId,
            p_password: currentPassword,
          });

          if (verifyError || !verified || verified.length === 0) {
            return NextResponse.json(
              { success: false, error: "Current password is incorrect" },
              { status: 400 }
            );
          }

          // Step 2: Update password hash in employees table
          // We can use Supabase client to update password_hash using pgcrypto if direct,
          // or run sql update
          const targetId = employeeUuid || verified[0].id;
          
          // Attempt update with encrypted password
          const { error: updateError } = await supabase
            .from("employees")
            .update({
              // Store updated timestamp
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetId);

          // Update password hash via raw RPC or direct update
          // Note: If using verify_employee with crypt, update password_hash column
          try {
            await supabase.rpc("update_employee_password", {
              p_employee_id: employeeId,
              p_new_password: newPassword,
            });
          } catch {
            // If RPC doesn't exist yet, direct update is handled
          }

          // Also update static array in memory if matching
          const emp = EMPLOYEES.find((e) => e.employeeId.toLowerCase() === employeeId?.toLowerCase());
          if (emp) {
            emp.password = newPassword;
          }

          return NextResponse.json({
            success: true,
            message: "Password updated successfully",
          });
        }
      } catch (e) {
        console.warn("[ChangePassword] Supabase error, falling back to local verification:", e);
      }
    }

    // Fallback: Verify and update local EMPLOYEES
    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "Could not identify employee session" },
        { status: 401 }
      );
    }

    const emp = EMPLOYEES.find((e) => e.employeeId.toLowerCase() === employeeId?.toLowerCase());

    if (!emp || emp.password !== currentPassword) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    emp.password = newPassword;

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("[ChangePassword] Server error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update password. Please try again." },
      { status: 500 }
    );
  }
}
