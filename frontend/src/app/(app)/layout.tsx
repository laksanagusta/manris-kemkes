"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

function AppRouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

const AppShell = dynamic(
  () => import("@/components/app-shell").then((mod) => mod.AppShell),
  { ssr: false, loading: () => <AppRouteFallback /> }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hasFullSession, isAuthenticated, loading, requiresPasswordChange } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (requiresPasswordChange) {
      router.replace("/change-password");
    }
  }, [isAuthenticated, loading, requiresPasswordChange, router]);

  if (loading || !hasFullSession) {
    return <AppRouteFallback />;
  }

  return <AppShell>{children}</AppShell>;
}
