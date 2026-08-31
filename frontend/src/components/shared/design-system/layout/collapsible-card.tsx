import type { ComponentProps } from "react";
import { ChevronDown } from "@/components/ui/icons";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function CollapsibleCardRoot({
  children,
  className,
  defaultOpen = true,
  ...props
}: ComponentProps<typeof Collapsible>) {
  return (
    <Card className={cn("overflow-hidden rounded-xl bg-card p-0", className)}>
      <Collapsible defaultOpen={defaultOpen} {...props}>
        {children}
      </Collapsible>
    </Card>
  );
}

function CollapsibleCardTrigger({
  children,
  className,
  ...props
}: ComponentProps<typeof CollapsibleTrigger>) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full items-center justify-between gap-4 px-4 py-4 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30",
        className,
      )}
      {...props}
    >
      {children}
    </CollapsibleTrigger>
  );
}

function CollapsibleCardHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-3", className)}
      {...props}
    />
  );
}

function CollapsibleCardIcon({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-inset ring-border/80",
        className,
      )}
      {...props}
    >
      <ChevronDown
        aria-hidden="true"
        className="size-4 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none"
      />
    </span>
  );
}

function CollapsibleCardText({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("min-w-0", className)} {...props} />;
}

function CollapsibleCardTitle({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn("truncate text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function CollapsibleCardDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn("mt-1 text-xs leading-5 text-secondary-foreground", className)}
      {...props}
    />
  );
}

function CollapsibleCardActions({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-3", className)}
      {...props}
    />
  );
}

function CollapsibleCardContent({
  children,
  className,
  ...props
}: ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className={cn(
        "data-open:animate-collapsible-down data-closed:animate-collapsible-up duration-200 ease-(--ease-out) motion-reduce:animate-none",
        className,
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
}

function CollapsibleCardBody({
  className,
  ...props
}: ComponentProps<typeof CardContent>) {
  return (
    <CardContent
      className={cn("border-t border-border/60", className)}
      {...props}
    />
  );
}

export const CollapsibleCard = {
  Root: CollapsibleCardRoot,
  Trigger: CollapsibleCardTrigger,
  Header: CollapsibleCardHeader,
  Icon: CollapsibleCardIcon,
  Text: CollapsibleCardText,
  Title: CollapsibleCardTitle,
  Description: CollapsibleCardDescription,
  Actions: CollapsibleCardActions,
  Content: CollapsibleCardContent,
  Body: CollapsibleCardBody,
} as const;
