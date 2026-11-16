import type { Metadata } from "next";
import { VerifyEmailScreen } from "@/components/password-recovery";

export const metadata: Metadata = { title: "Verifikasi email", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function VerifyEmailPage() {
  return <VerifyEmailScreen />;
}
