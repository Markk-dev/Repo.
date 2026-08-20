import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import { SESSION_COOKIE_NAME } from "@/utils/session-config";
import { EMPLOYEES } from "@/constants/employees";

export interface ParsedDevice {
  id: string;
  os: string;
  browser: string;
  deviceType: "desktop" | "mobile" | "tablet";
  ipAddress: string | null;
  location: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
  isValid: boolean;
}

// In-memory device login audit trail (persisted across requests during server runtime)
const DEVICE_HISTORY_CACHE: Record<string, ParsedDevice[]> = {};

function parseUserAgent(ua: string | null): {
  os: string;
  browser: string;
  deviceType: "desktop" | "mobile" | "tablet";
} {
  if (!ua) {
    return { os: "Windows", browser: "Chrome", deviceType: "desktop" };
  }

  let os = "Windows";
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";

  if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/android/i.test(ua)) {
    os = "Android";
    deviceType = "mobile";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = /ipad/i.test(ua) ? "iPadOS" : "iOS";
    deviceType = /ipad/i.test(ua) ? "tablet" : "mobile";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  let browser = "Chrome";
  if (/edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) {
    browser = "Chrome";
  } else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) {
    browser = "Safari";
  } else if (/firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/opera|opr\//i.test(ua)) {
    browser = "Opera";
  }

  return { os, browser, deviceType };
}

/**
 * GET /api/auth/devices
 * Retrieves all active AND past historical login sessions for tracking/auditing.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const currentSessionKey = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!currentSessionKey) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const currentUa = request.headers.get("user-agent") || "Unknown Device";
    const forwardedFor = request.headers.get("x-forwarded-for");
    const currentIp = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "127.0.0.1";

    let employeeId = "26-008-0005";

    if (currentSessionKey.startsWith("local_")) {
      try {
        const parts = currentSessionKey.split("_");
        employeeId = Buffer.from(parts[1], "base64").toString("utf-8");
      } catch {
        // use default
      }
    }

    const hasSupabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== "YOUR_SERVICE_ROLE_KEY_HERE";

    let devices: ParsedDevice[] = [];

    if (hasSupabaseServiceKey && !currentSessionKey.startsWith("local_")) {
      try {
        const supabase = createAdminClient(cookieStore);

        // Validate session to find employee
        const { data: sessionData, error: sessionErr } = await supabase.rpc("validate_session", {
          p_session_key: currentSessionKey,
        });

        if (!sessionErr && sessionData && sessionData.length > 0) {
          const employeeUuid = sessionData[0].employee_id;
          employeeId = sessionData[0].employee_id_code || employeeId;

          // Fetch ALL user session history records (active + revoked/expired)
          const { data: sessions, error: listError } = await supabase
            .from("user_sessions")
            .select("id, session_key, device_info, ip_address, created_at, last_rotated_at, is_valid")
            .eq("employee_id", employeeUuid)
            .order("created_at", { ascending: false })
            .limit(25);

          if (!listError && sessions && sessions.length > 0) {
            devices = sessions.map((s) => {
              const { os, browser, deviceType } = parseUserAgent(s.device_info);
              const isCurrent = s.session_key === currentSessionKey;

              return {
                id: s.id,
                os,
                browser,
                deviceType,
                ipAddress: s.ip_address || currentIp,
                location: "Lucena City, Calabarzon, Philippines",
                createdAt: s.created_at,
                lastActive: s.last_rotated_at || s.created_at,
                isCurrent,
                isValid: s.is_valid,
              };
            });
          }
        }
      } catch (e) {
        console.warn("[Devices API] Supabase query failed:", e);
      }
    }

    const city = request.headers.get("x-vercel-ip-city") || request.headers.get("cf-ipcity");
    const region = request.headers.get("x-vercel-ip-country-region") || request.headers.get("cf-region");
    const country = request.headers.get("x-vercel-ip-country") || "Philippines";
    const dynamicLocation = city && region ? `${city}, ${region}, ${country}` : city ? `${city}, ${country}` : "Lucena City, Calabarzon, Philippines";

    // Ensure we have current device registered
    const { os, browser, deviceType } = parseUserAgent(currentUa);
    const currentDeviceEntry: ParsedDevice = {
      id: currentSessionKey,
      os,
      browser,
      deviceType,
      ipAddress: currentIp,
      location: dynamicLocation,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      isCurrent: true,
      isValid: true,
    };

    if (!DEVICE_HISTORY_CACHE[employeeId]) {
      DEVICE_HISTORY_CACHE[employeeId] = [currentDeviceEntry];
    } else {
      // Find if this physical device (same OS, browser, and deviceType) was already recorded
      const matchIdx = DEVICE_HISTORY_CACHE[employeeId].findIndex(
        (d) => d.os === os && d.browser === browser && d.deviceType === deviceType
      );

      if (matchIdx >= 0) {
        // Update the existing device record with new session details
        DEVICE_HISTORY_CACHE[employeeId][matchIdx] = {
          ...DEVICE_HISTORY_CACHE[employeeId][matchIdx],
          id: currentSessionKey,
          ipAddress: currentIp,
          location: dynamicLocation,
          lastActive: new Date().toISOString(),
          isCurrent: true,
          isValid: true,
        };
      } else {
        DEVICE_HISTORY_CACHE[employeeId].unshift(currentDeviceEntry);
      }

      // Mark all other devices for this employee as not current
      DEVICE_HISTORY_CACHE[employeeId].forEach((d) => {
        if (d.id !== currentSessionKey) {
          d.isCurrent = false;
        }
      });
    }

    // Deduplicate Supabase sessions by device fingerprint if applicable
    let allHistory = DEVICE_HISTORY_CACHE[employeeId];
    if (devices.length > 0) {
      const seen = new Set<string>();
      const deduped: ParsedDevice[] = [];
      for (const d of devices) {
        const key = `${d.os}_${d.browser}_${d.deviceType}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(d);
        }
      }
      allHistory = deduped;
    }

    // Current device is always the one matching current session
    const activeCurrent = allHistory.find((d) => d.isCurrent) || currentDeviceEntry;
    const previousHistory = allHistory.filter((d) => d.id !== activeCurrent.id);

    return NextResponse.json({
      success: true,
      currentDevice: activeCurrent,
      otherDevices: previousHistory,
      totalCount: allHistory.length,
    });
  } catch (error) {
    console.error("[Devices API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch device sessions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/devices
 * Revokes a session or all other sessions.
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const currentSessionKey = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!currentSessionKey) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    let employeeId = "26-008-0005";
    if (currentSessionKey.startsWith("local_")) {
      try {
        const parts = currentSessionKey.split("_");
        employeeId = Buffer.from(parts[1], "base64").toString("utf-8");
      } catch {
        // use default
      }
    }

    // Remove from in-memory cache
    if (DEVICE_HISTORY_CACHE[employeeId]) {
      DEVICE_HISTORY_CACHE[employeeId] = DEVICE_HISTORY_CACHE[employeeId].filter(
        (d) => d.id !== sessionId
      );
    }

    const hasSupabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== "YOUR_SERVICE_ROLE_KEY_HERE";

    if (hasSupabaseServiceKey && sessionId && !currentSessionKey.startsWith("local_")) {
      try {
        const supabase = createAdminClient(cookieStore);
        await supabase
          .from("user_sessions")
          .update({ is_valid: false })
          .eq("id", sessionId);
      } catch (e) {
        console.warn("[Devices API] Failed to revoke session:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Device session revoked successfully",
    });
  } catch (error) {
    console.error("[Devices API] Revoke error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke device session" },
      { status: 500 }
    );
  }
}
