import type { Metadata } from "next";
import { ResendRegistrationVerificationScreen } from "@/components/password-recovery";

export const metadata: Metadata = {
  title: "Kirim ulang tautan verifikasi",
  robots: { index: false, follow: false },
};

export default function ResendRegistrationVerificationPage() {
  return <ResendRegistrationVerificationScreen />;
}
