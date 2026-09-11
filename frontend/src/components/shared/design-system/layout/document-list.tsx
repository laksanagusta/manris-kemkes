import { useId, type ReactNode } from "react";

import { Plus } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ListGroup } from "@/components/ui/list-group";
import { cn } from "@/lib/utils";

export type DocumentListItem = {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
};

export type DocumentListSectionProps = {
  title: string;
  items: readonly DocumentListItem[];
  onAdd?: () => void;
  addLabel?: string;
  emptyMessage?: ReactNode;
  className?: string;
};

/**
 * Compact document list surface used for repeatable charter content.
 * The section label stays above the surface while the add affordance remains
 * in the surface header, keeping item details calm while they are edited in a modal.
 */
export function DocumentListSection({
  title,
  items,
  onAdd,
  addLabel = `Tambah ${title.toLowerCase()}`,
  emptyMessage = "Belum ada data.",
  className,
}: DocumentListSectionProps) {
  const labelId = useId();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2
          id={labelId}
          className="text-sm font-semibold leading-5 text-foreground"
        >
          {title}
        </h2>
        {onAdd ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={addLabel}
            title={addLabel}
            onClick={onAdd}
            className="rounded-full text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <ListGroup
        className="surface-hairline rounded-xl bg-card px-4 py-1.5"
        role="region"
        aria-labelledby={labelId}
      >
        {items.length > 0 ? (
          <div
            className="space-y-1"
            role="list"
            aria-label={`${title} items`}
          >
            {items.map((item) => (
              <div
                key={item.id}
                role="listitem"
                className="flex min-h-[55px] items-center justify-between gap-4 rounded-lg px-0 py-1.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm leading-5 text-foreground">
                    {item.title}
                  </p>
                  {item.meta ? (
                    <p className="truncate text-sm leading-5 text-muted-foreground">
                      {item.meta}
                    </p>
                  ) : null}
                </div>
                {item.action ? <div className="shrink-0">{item.action}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-0 py-1.5 text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </ListGroup>
    </div>
  );
}
