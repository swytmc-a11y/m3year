import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Refreshes the Supabase auth cookie on every request that reaches a page.
 * server.ts's createClient() cannot write a refreshed cookie itself when
 * called from a Server Component (no request context to write to) — this
 * is the only place that can, which is why updateSession existed but never
 * ran: nothing was invoking it.
 *
 * Without this, an operator's session silently stops refreshing once the
 * access token expires, and they get logged out instead of staying signed
 * in through normal use.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets and image optimization — there is no session to
     * refresh for a font file, and running the Supabase client on every
     * asset request would be pure overhead.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
