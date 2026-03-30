"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(
  () => import("@/components/app-shell").then((mod) => mod.AppShell),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
