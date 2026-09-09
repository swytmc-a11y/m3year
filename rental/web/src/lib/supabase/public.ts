import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

/**
 * A Supabase client with no cookie binding, for reading public data.
 *
 * The cookie-based server client in ./server.ts opts a route out of static
 * rendering entirely (Next.js treats reading cookies as a request-time
 * dependency), which broke the landing page counts and the sitemap: both were
 * silently falling back to their error paths on every build.
 *
 * Nothing here needs a user session — these queries read published rows that
 * anon can already see. Using the anon key directly keeps the routes
 * statically renderable and cacheable.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
