import { useId, type ComponentProps, type ReactNode } from "react";

import { ListGroup } from "@/components/ui/list-group";
import { cn } from "@/lib/utils";

export type LabeledListProps = Omit<ComponentProps<"section">, "title"> & {
  label: ReactNode;
  children: ReactNode;
  surfaceClassName?: string;
  listClassName?: string;
};

export type LabeledListItemProps = Omit<ComponentProps<"li">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
};

/**
 * A calm grouped-list surface with an external section label.
 * Use it for short settings, metadata, or navigation lists where each row
 * needs one shared inset and separators should not touch the outer radius.
 */
export function LabeledList({
  label,
  children,
  className,
  surfaceClassName,
  listClassName,
  ...props
}: LabeledListProps) {
  const labelId = useId();

  return (
    <section className={cn("space-y-3", className)} {...props}>
      <h2
        id={labelId}
        className="px-4 text-[13px] font-medium leading-4 text-secondary-foreground"
      >
        {label}
      </h2>
      <ListGroup
        className={cn(
          "surface-hairline rounded-[12px] bg-card",
          surfaceClassName,
        )}
      >
        <ul
          aria-labelledby={labelId}
          className={cn("m-0 list-none p-0", listClassName)}
        >
          {children}
        </ul>
      </ListGroup>
    </section>
  );
}

export function LabeledListItem({
  title,
  description,
  leading,
  trailing,
  className,
  ...props
}: LabeledListItemProps) {
  return (
    <li
      className={cn(
        "relative flex min-h-14 items-center gap-3 px-4 py-3 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-border/70 last:after:hidden",
        className,
      )}
      {...props}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-5 text-foreground">
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </li>
  );
}
