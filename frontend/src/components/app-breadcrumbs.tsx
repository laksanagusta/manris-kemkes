"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const segmentLabels: Record<string, string> = {
  account: "Akun",
  admin: "Administrasi",
  compliance: "Kepatuhan",
  controls: "Kontrol",
  evaluations: "Evaluasi",
  history: "Riwayat",
  inbox: "Kotak Masuk",
  intelligence: "Intelligence",
  management: "Manajemen",
  minutes: "Notulen",
  monitoring: "Pemantauan",
  new: "Baru",
  overview: "Dashboard",
  register: "Daftar Risiko",
  reports: "Laporan",
  risk: "Risiko",
  settings: "Pengaturan",
  "working-papers": "Kertas Kerja",
};

function getSegmentLabel(segment: string) {
  if (/^[0-9a-f-]{16,}$/i.test(segment)) return "Detail";

  return (
    segmentLabels[segment] ??
    decodeURIComponent(segment)
      .replaceAll("-", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:text-sm">
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink asChild>
            <Link href="/overview" className="font-medium">
              Manris
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;

          return (
            <Fragment key={href}>
              {(index > 0 || segments.length > 0) && (
                <BreadcrumbSeparator className="hidden text-muted-foreground/50 sm:block" />
              )}
              <BreadcrumbItem className={isLast ? "min-w-0" : "hidden sm:inline-flex"}>
                {isLast ? (
                  <BreadcrumbPage className="truncate font-medium">
                    {getSegmentLabel(segment)}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{getSegmentLabel(segment)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
