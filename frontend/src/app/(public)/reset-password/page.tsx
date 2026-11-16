import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/components/password-recovery";

export const metadata: Metadata = { title: "Buat password baru", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
