import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPendingOtp } from "@/lib/auth";
import { AdminOtpForm } from "@/app/admin-verify/otp-form";

// Sibling to /admin, not nested under it — AdminLayout's requireAdmin()
// would redirect back here forever if this page lived at /admin/verify,
// since reaching that gate is the one thing an unverified admin can't do yet.
export default async function AdminVerifyPage() {
  const user = await requireAdminPendingOtp();

  // Someone who already has a live OTP session has no reason to be here —
  // send them straight to the console instead of showing a stale form.
  const supabase = await createClient();
  const { data: otp } = await supabase
    .from("admin_otp_verifications")
    .select("expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (otp && new Date(otp.expires_at) > new Date()) {
    redirect("/admin");
  }

  return (
    <div className="admin-shell flex min-h-screen flex-col items-center justify-center bg-admin-bg px-6 py-12">
      <AdminOtpForm email={user.email ?? ""} />
    </div>
  );
}
