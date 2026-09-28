import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export type EmptyStateIllustrationSize = "standard" | "compact";

export function EmptyStateIllustration({
  size = "standard",
  className,
}: {
  size?: EmptyStateIllustrationSize;
  className?: string;
}) {
  return (
    <Image
      src="/images/risk-register-empty-state.png"
      alt=""
      aria-hidden="true"
      width={320}
      height={180}
      sizes={size === "compact" ? "112px" : "256px"}
      className={cn(
        "h-auto w-full object-contain",
        size === "compact" ? "max-w-28" : "max-w-64",
        className,
      )}
    />
  );
}

export function IllustratedEmptyState({
  title,
  titleClassName,
  description,
  action,
  size = "standard",
  align = "center",
  className,
}: {
  title?: ReactNode;
  titleClassName?: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: EmptyStateIllustrationSize;
  align?: "left" | "center";
  className?: string;
}) {
  const isLeftAligned = align === "left";

  return (
    <Empty
      className={cn(
        "flex-none gap-1 rounded-none border-0 p-0 text-center",
        isLeftAligned && "items-start text-left",
        className,
      )}
    >
      <EmptyMedia
        className={cn("mb-1 w-full", isLeftAligned && "justify-start")}
      >
        <EmptyStateIllustration size={size} />
      </EmptyMedia>
      <EmptyHeader
        className={cn("gap-1", isLeftAligned && "items-start text-left")}
      >
        {title ? (
          <EmptyTitle
            className={cn(
              "text-sm font-normal leading-5 tracking-normal text-foreground",
              titleClassName,
            )}
          >
            {title}
          </EmptyTitle>
        ) : null}
        {description ? (
          <EmptyDescription className="max-w-lg text-xs leading-5 text-muted-foreground">
            {description}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent className="mt-1">{action}</EmptyContent> : null}
    </Empty>
  );
}
