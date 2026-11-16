import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/password-recovery";

export const metadata: Metadata = { title: "Lupa password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
