/**
 * Supabase connection details.
 *
 * These two values are public by design — Supabase ships them in every
 * client bundle, and the actual security boundary is row level security,
 * not secrecy of the key. They are committed as fallbacks so a fresh
 * deployment works with no dashboard configuration; setting the matching
 * environment variables overrides them, which is what you want when
 * pointing a build at a different project.
 *
 * Nothing that grants privilege (a service_role key) belongs here, or
 * anywhere else in this repository.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://eaaayvxzohgcweyllsey.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_4rBDo5NWk9wG5jSfOuSwUg_UNu8GcLv";
