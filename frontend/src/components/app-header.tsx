"use client";

import { usePathname } from "next/navigation";
import { getAppPageMeta } from "@/lib/app-navigation";
import { useHeaderActions } from "@/lib/header-actions-context";
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
    pathname === "/overview" ||
    pathname === "/design-system" ||
    pathname === "/risk/register/new" ||
    pathname === "/risk/register/import-sop" ||
    pathname === "/compliance/penanganan/impor"
  ) {
    return null;
  }

  if (isCharterDetail) {
    return null;
  }

  return (
    <div className="w-full">
      <CollectionPageHeader
        title={title}
        subtitle={subtitle}
        showTitle
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
        className="mb-4 w-full"
      />
    </div>
  );
}
