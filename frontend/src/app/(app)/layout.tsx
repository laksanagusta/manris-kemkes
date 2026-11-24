"use client";

import dynamic from "next/dynamic";
import styles from "@/components/app-shell.module.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoadingSkeleton, TableLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { HeaderActionsProvider } from "@/lib/header-actions-context";

function AppRouteFallback() {
  return (
    <div className="flex min-h-dvh w-full bg-(--app-shell-canvas)">
      <div aria-hidden="true" className="hidden w-[260px] shrink-0 space-y-5 p-4 md:block lg:w-[300px]">
        <Skeleton className="mb-8 h-7 w-28" />
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-3/4" />
        ))}
      </div>
      <div className="min-w-0 flex-1 md:p-2">
        <div className="min-h-full bg-workspace md:rounded-(--surface-radius) md:shadow-(--surface-shadow-low)">
          <div aria-hidden="true" className="hidden min-h-14 items-center border-b border-border px-5 md:flex">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className={`${styles.bottomInset} px-4 pt-5 md:px-5`}>
            <PageLoadingSkeleton><TableLoadingSkeleton message="Memuat ruang kerja…" /></PageLoadingSkeleton>
          </div>
        </div>
      </div>
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

  return (
    <HeaderActionsProvider>
      <AppShell>{children}</AppShell>
    </HeaderActionsProvider>
  );
}
