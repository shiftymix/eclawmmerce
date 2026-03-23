import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && url.startsWith("http")) return url;
  return "https://placeholder.supabase.co";
}

function getAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (key && key.length > 20) return key;
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";
}

function getServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key && key.length > 20) return key;
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getUrl(), getAnonKey(), {
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
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

// Service role client for server-only operations (cron, seeding)
// Bypasses RLS — never use in client code
export function createServiceClient() {
  return createSupabaseClient(getUrl(), getServiceKey());
}
