"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { getBreadcrumbItems, type BreadcrumbItem } from "@/lib/app-navigation";
import {
  Breadcrumb,
  BreadcrumbItem as BreadcrumbItemPrimitive,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type RecordValue = Record<string, unknown>;

type DynamicBreadcrumbResource = {
  endpoint: string;
  resolve: (value: unknown) => string | undefined;
};

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object" ? (value as RecordValue) : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function nestedStringValue(
  value: unknown,
  parentKey: string,
  childKey: string,
): string | undefined {
  return stringValue(asRecord(asRecord(value)?.[parentKey])?.[childKey]);
}

function getDynamicBreadcrumbResource(
  pathname: string,
  searchParams: URLSearchParams,
): DynamicBreadcrumbResource | null {
  const route = pathname.replace(/\/+$/, "") || "/";
  const riskId = route === "/risk/register/new"
    ? searchParams.get("id")
    : /^\/risk\/register\/([^/]+)$/.exec(route)?.[1];

  if (riskId && riskId !== "new") {
    return {
      endpoint: `/risks/${encodeURIComponent(riskId)}`,
      resolve: (value) => stringValue(asRecord(value)?.code),
    };
  }

  const monitoringId = /^\/risk\/(?:assessment|monitoring)\/([^/]+)$/.exec(route)?.[1];
  if (monitoringId) {
    return {
      endpoint: `/risk-monitorings/${encodeURIComponent(monitoringId)}`,
      resolve: (value) =>
        nestedStringValue(value, "resultRisk", "code") ??
        nestedStringValue(value, "sourceRisk", "code"),
    };
  }

  const eventId = /^\/risk-events\/([^/]+)$/.exec(route)?.[1];
  if (eventId) {
    return {
      endpoint: `/risk-events/${encodeURIComponent(eventId)}`,
      resolve: (value) => stringValue(asRecord(value)?.code),
    };
  }

  const workingPaperId = /^\/risk\/working-papers\/([^/]+)$/.exec(route)?.[1];
  if (workingPaperId && workingPaperId !== "new") {
    return {
      endpoint: `/working-papers/${encodeURIComponent(workingPaperId)}`,
      resolve: (value) => stringValue(asRecord(value)?.code),
    };
  }

  const charterId = /^\/management\/charters\/([^/]+)$/.exec(route)?.[1];
  if (charterId && charterId !== "new") {
    return {
      endpoint: `/risk-charters/${encodeURIComponent(charterId)}`,
      resolve: (value) => stringValue(asRecord(value)?.title),
    };
  }

  const evaluationId = /^\/evaluations\/([^/]+)$/.exec(route)?.[1];
  if (evaluationId && evaluationId !== "new") {
    return {
      endpoint: `/evaluations/${encodeURIComponent(evaluationId)}`,
      resolve: (value) => stringValue(asRecord(value)?.code),
    };
  }

  const minuteId = /^\/minutes\/([^/]+)$/.exec(route)?.[1];
  if (minuteId && minuteId !== "new") {
    return {
      endpoint: `/meeting-minutes/${encodeURIComponent(minuteId)}`,
      resolve: (value) => stringValue(asRecord(value)?.title),
    };
  }

  return null;
}

function BreadcrumbLinkItem({ item }: { item: BreadcrumbItem }) {
  return (
    <BreadcrumbLink asChild className="text-muted-foreground">
      <Link href={item.href!} className="max-w-[min(36vw,14rem)] truncate">
        {item.label}
      </Link>
    </BreadcrumbLink>
  );
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [dynamicLabelState, setDynamicLabelState] = useState<{
    endpoint: string;
    label?: string;
  } | null>(null);
  const search = searchParams.toString();

  const dynamicResource = useMemo(
    () => getDynamicBreadcrumbResource(pathname, new URLSearchParams(search)),
    [pathname, search],
  );

  useEffect(() => {
    let cancelled = false;

    if (!token || !dynamicResource) return;

    api
      .get<unknown>(dynamicResource.endpoint, token)
      .then((value) => {
        if (!cancelled) {
          setDynamicLabelState({
            endpoint: dynamicResource.endpoint,
            label: dynamicResource.resolve(value),
          });
        }
      })
      .catch(() => {
        // The page owns the error state. Breadcrumbs keep their safe fallback.
      });

    return () => {
      cancelled = true;
    };
  }, [dynamicResource, token]);

  const dynamicLabel = dynamicResource && dynamicLabelState &&
    dynamicResource.endpoint === dynamicLabelState.endpoint
    ? dynamicLabelState.label
    : undefined;

  const items = getBreadcrumbItems(
    pathname,
    new URLSearchParams(search),
    dynamicLabel,
  );

  return (
    <Breadcrumb className="max-w-[min(64vw,32rem)] overflow-hidden">
      <BreadcrumbList className="flex-nowrap gap-1 overflow-hidden text-xs sm:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Fragment key={`${item.href ?? "current"}-${item.label}`}>
              {index > 0 ? (
                <BreadcrumbSeparator className="hidden text-muted-foreground/50 sm:block" />
              ) : null}
              <BreadcrumbItemPrimitive className={isLast ? "min-w-0" : "hidden sm:inline-flex"}>
                {item.href && !isLast ? (
                  <BreadcrumbLinkItem item={item} />
                ) : (
                  <BreadcrumbPage className="truncate font-medium text-foreground">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItemPrimitive>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
