"use client";

import { usePathname } from "next/navigation";
import { getAppPageMeta } from "@/lib/app-navigation";
import { useHeaderActions } from "@/lib/header-actions-context";
import { cn } from "@/lib/utils";
import {
  CollectionPageHeader,
  PAGE_HEADER_ACTION_SLOT_ID,
  PAGE_BACK_ACTION_SLOT_ID,
} from "@/components/shared/design-system";

export function AppHeader() {
  const pathname = usePathname();
  const actions = useHeaderActions();
  const { title, subtitle } = getAppPageMeta(pathname);
  const isCharterDetail = /^\/management\/charters\/[^/]+$/.test(pathname);
  const isMeetingBriefingCreate = pathname === "/minutes/new";
  const isMeetingBriefingDetail = /^\/minutes\/[^/]+$/.test(pathname);

  if (pathname === "/overview" || pathname === "/risk/register/new") {
    return null;
  }

  if (isCharterDetail) {
    return null;
  }

  return (
    <div
      className={cn(
        "mx-auto w-full",
        isMeetingBriefingCreate || isMeetingBriefingDetail
          ? "max-w-5xl"
          : "max-w-[1400px]",
      )}
    >
      <div
        id={PAGE_BACK_ACTION_SLOT_ID}
        className="mb-3 flex items-center empty:hidden"
      />
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
        className="mb-12 w-full"
      />
    </div>
  );
}
