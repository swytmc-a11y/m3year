import { redirect } from "next/navigation";
import { VerifyOtpForm } from "./verify-otp-form";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;

  if (!phone) {
    redirect("/auth");
  }

  return <VerifyOtpForm phone={phone} />;
}
