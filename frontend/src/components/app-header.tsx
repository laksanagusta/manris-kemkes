"use client";

import { usePathname } from "next/navigation";
import { getAppPageMeta } from "@/lib/app-navigation";
import { useHeaderActions } from "@/lib/header-actions-context";
import { cn } from "@/lib/utils";
import {
  CollectionPageHeader,
  PAGE_HEADER_ACTION_SLOT_ID,
} from "@/components/shared/design-system";

export function AppHeader() {
  const pathname = usePathname();
  const actions = useHeaderActions();
  const { title, subtitle } = getAppPageMeta(pathname);
  const isCharterDetail =
    /^\/management\/charters\/[^/]+$/.test(pathname) &&
    pathname !== "/management/charters/new";

  if (
    pathname === "/agent" ||
    pathname.startsWith("/agent/") ||
    pathname === "/overview" ||
    pathname === "/work" ||
    pathname === "/design-system" ||
    pathname === "/risk/register/new" ||
    pathname === "/risk/register/import-sop" ||
    pathname === "/compliance/penanganan/impor"
  ) {
    return null;
  }

  const isEvaluationDetail =
    /^\/evaluations\/[^/]+$/.test(pathname) &&
    pathname !== "/evaluations/new";

  if (isCharterDetail || isEvaluationDetail) {
    return null;
  }

  return (
    <div className="w-full">
      <CollectionPageHeader
        title={title}
        subtitle={subtitle}
        showTitle
        titleClassName="md:sr-only"
        actionsPlacement="title"
        actions={
          <>
            {actions}
            <div
              id={PAGE_HEADER_ACTION_SLOT_ID}
              className="contents"
            />
          </>
        }
        className={cn("mb-4 w-full", !actions && "md:mb-0")}
      />
    </div>
  );
}
