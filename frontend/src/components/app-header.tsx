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
  const isCharterDetail = /^\/management\/charters\/[^/]+$/.test(pathname);

  if (
    pathname === "/overview" ||
    pathname === "/risk/register/new" ||
    pathname === "/intelligence/document"
  ) {
    return null;
  }

  if (isCharterDetail) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
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
        className="mb-6 w-full"
      />
    </div>
  );
}
