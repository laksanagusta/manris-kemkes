"use client";

import {
  createContext,
  useContext,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowUpRight,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { FieldErrorMessage } from "../fields/field-error-message";

type ResourceLinkMenuContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const ResourceLinkMenuContext = createContext<ResourceLinkMenuContextValue | null>(
  null,
);

export type ResourceLinkListProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function ResourceLinkList({
  children,
  className,
  ariaLabel = "Resource links",
}: ResourceLinkListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ResourceLinkMenuContext.Provider value={{ openId, setOpenId }}>
      <div
        role="list"
        aria-label={ariaLabel}
        className={cn("flex max-w-full flex-wrap items-center gap-2", className)}
      >
        {children}
      </div>
    </ResourceLinkMenuContext.Provider>
  );
}

export type ResourceLinkRowProps = {
  id: string;
  name: string;
  url: string;
  onSave: (values: { name: string; url: string }) => void;
  onDelete: () => void;
  className?: string;
};

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ResourceLinkRow({
  id,
  name,
  url,
  onSave,
  onDelete,
  className,
}: ResourceLinkRowProps) {
  const menuContext = useContext(ResourceLinkMenuContext);
  const editFieldId = useId();
  const [localMenuOpen, setLocalMenuOpen] = useState(false);
  const isMenuOpen = menuContext ? menuContext.openId === id : localMenuOpen;
  const setIsMenuOpen = (open: boolean) => {
    if (menuContext) {
      menuContext.setOpenId(open ? id : null);
      return;
    }
    setLocalMenuOpen(open);
  };
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftUrl, setDraftUrl] = useState(url);
  const [editError, setEditError] = useState<string | null>(null);
  const cancelDeleteId = useId();

  const openEdit = () => {
    setDraftName(name);
    setDraftUrl(url);
    setEditError(null);
    setIsEditOpen(true);
  };

  const closeEdit = (open: boolean) => {
    setIsEditOpen(open);
    if (!open) setEditError(null);
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = draftName.trim();
    const nextUrl = draftUrl.trim();

    if (!nextName) {
      setEditError("Nama link wajib diisi.");
      return;
    }
    if (!isHttpUrl(nextUrl)) {
      setEditError("URL harus berupa link http:// atau https:// yang valid.");
      return;
    }

    onSave({ name: nextName, url: nextUrl });
    setIsEditOpen(false);
    setEditError(null);
  };

  return (
    <>
      <div
        role="listitem"
        data-state={isMenuOpen || isEditOpen || isDeleteOpen ? "active" : "idle"}
        className={cn(
          "group/resource-row flex min-w-0 max-w-full items-center gap-1 rounded-md px-1.5 py-1 transition-[background-color,color] duration-150 motion-reduce:transition-none hover:bg-sidebar-accent data-[state=active]:bg-sidebar-accent",
          className,
        )}
      >
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 max-w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none"
          title={url}
        >
          <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 max-w-full truncate">{name}</span>
        </a>

        <DropdownMenu
          open={isMenuOpen}
          onOpenChange={setIsMenuOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Options for ${name}`}
              className="group/options-trigger relative shrink-0 translate-x-0 bg-transparent text-muted-foreground opacity-100 shadow-none transition-[opacity,transform] duration-150 hover:bg-transparent hover:text-muted-foreground hover:shadow-none data-[state=open]:bg-transparent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:shadow-none active:translate-y-0 motion-reduce:transition-none"
            >
              <ArrowUpRight
                aria-hidden="true"
                className="absolute inset-0 m-auto size-3.5 transition-opacity duration-150 group-hover/resource-row:opacity-0 group-focus-within/resource-row:opacity-0 group-data-[state=open]/options-trigger:opacity-0 motion-reduce:transition-none"
              />
              <MoreHorizontal
                aria-hidden="true"
                className="absolute inset-0 m-auto size-3.5 opacity-0 transition-opacity duration-150 group-hover/resource-row:opacity-100 group-focus-within/resource-row:opacity-100 group-data-[state=open]/options-trigger:opacity-100 motion-reduce:transition-none"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-36 motion-reduce:animate-none motion-reduce:transition-none"
          >
            <DropdownMenuItem onSelect={openEdit}>
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setIsDeleteOpen(true)}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isEditOpen} onOpenChange={closeEdit}>
        <DialogContent showCloseButton={false} className="max-w-md">
          <form onSubmit={saveEdit} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Edit Link</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${editFieldId}-name`}>Nama</Label>
                <Input
                  id={`${editFieldId}-name`}
                  value={draftName}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    setEditError(null);
                  }}
                  autoFocus
                  aria-invalid={Boolean(editError)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${editFieldId}-url`}>URL</Label>
                <Input
                  id={`${editFieldId}-url`}
                  value={draftUrl}
                  onChange={(event) => {
                    setDraftUrl(event.target.value);
                    setEditError(null);
                  }}
                  aria-invalid={Boolean(editError)}
                  aria-describedby={
                    editError ? `${editFieldId}-edit-error` : undefined
                  }
                />
              </div>
              <FieldErrorMessage id={`${editFieldId}-edit-error`}>
                {editError}
              </FieldErrorMessage>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeEdit(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => {
              document.getElementById(cancelDeleteId)?.focus();
            });
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete link?</AlertDialogTitle>
            <AlertDialogDescription>
              Link <span className="font-medium text-foreground">“{name}”</span> akan dihapus.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id={cancelDeleteId} variant="outline">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onDelete();
                setIsDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
