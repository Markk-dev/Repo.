import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client with the SERVICE ROLE key.
 * This bypasses RLS — use ONLY in server-side API routes
 * for session management functions.
 *
 * NEVER expose the service role key to the client.
 */
export const createAdminClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in environment variables. " +
      "Add it to .env.local (NOT prefixed with NEXT_PUBLIC_)."
    );
  }

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
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
            // Called from Server Component — middleware handles cookie sync
          }
        },
      },
    },
  );
};
