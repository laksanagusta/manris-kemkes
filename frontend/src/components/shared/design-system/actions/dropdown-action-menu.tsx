import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DialogActionList, type DialogActionItem } from "./dialog-action-list";

export function DropdownActionMenu({
  label,
  items,
}: {
  label: string;
  items: ReadonlyArray<DialogActionItem>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          className="border border-zinc-200/70 bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white hover:text-foreground"
        >
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-0 bg-transparent p-0 shadow-none">
        <DialogActionList items={items} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
