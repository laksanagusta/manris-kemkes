"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Organization } from "@/lib/organization";

interface OrganizationRowActionsProps {
  organization: Organization;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}

export function OrganizationRowActions({
  organization,
  onEdit,
  onDelete,
}: OrganizationRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={`Aksi organisasi ${organization.name}`}
        >
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(organization)}>
          <Pencil className="size-3.5 mr-1.5" />
          Ubah organisasi
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(organization)}
        >
          <Trash2 className="size-3.5 mr-1.5" />
          Hapus organisasi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}