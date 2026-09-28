"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/settings/settings-provider";

export default function AccountPage() {
  const { openSettings } = useSettings();
  const router = useRouter();
  useEffect(() => {
    openSettings("account");
    router.replace("/overview");
  }, [openSettings, router]);
  return null;
}
