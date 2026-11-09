"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./app-drawer";
import { ActionButton } from "./design-system/actions/action-button";
import { InsetList, InsetListItem } from "./design-system/layout/inset-list";
import type { EditableItem } from "./editable-items-table";

type EditableInsetItemsProps = {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  itemLabel: string;
  header: ReactNode;
  beforeAdd?: ReactNode;
  emptyMessage: string;
  disabled?: boolean;
  invalid?: boolean;
  itemErrors?: Array<string | undefined>;
  "aria-describedby"?: string;
};

export function EditableInsetItems({
  items,
  onChange,
  itemLabel,
  header,
  beforeAdd,
  emptyMessage,
  disabled,
  invalid,
  itemErrors,
  "aria-describedby": ariaDescribedBy,
}: EditableInsetItemsProps) {
  const fieldId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [draft, setDraft] = useState<EditableItem | null>(null);
  const itemName = itemLabel.toLowerCase();
  const editing = draft !== null && items.some(item => item.id === draft.id);

  const save = () => {
    if (!draft || disabled || !draft.text.trim()) return;
    const item = { ...draft, text: draft.text.trim() };
    onChange(editing ? items.map(current => current.id === item.id ? item : current) : [...items, item]);
    setDraft(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-48">{header}</div>
        {!disabled ? (
          <div className="flex shrink-0 items-center gap-2">
            {beforeAdd}
            <ActionButton
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={event => {
                triggerRef.current = event.currentTarget;
                setDraft({ id: crypto.randomUUID(), text: "" });
              }}
            >
              Tambah {itemName}
            </ActionButton>
          </div>
        ) : null}
      </div>

      <InsetList
        aria-label={itemLabel}
        aria-describedby={ariaDescribedBy}
        className={invalid ? "ring-1 ring-destructive" : undefined}
      >
        {items.length ? items.map((item, index) => (
          <InsetListItem
            key={item.id}
            action={!disabled ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${itemName} ${index + 1}`}
                  onClick={event => {
                    triggerRef.current = event.currentTarget;
                    setDraft(item);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus ${itemName} ${index + 1}`}
                  onClick={() => onChange(items.filter(current => current.id !== item.id))}
                >
                  <Trash2 />
                </Button>
              </div>
            ) : undefined}
          >
            <p className="whitespace-pre-wrap wrap-break-word text-sm text-secondary-foreground">
              {item.text.trim() || "Belum diisi"}
            </p>
            {itemErrors?.[index] ? (
              <p className="mt-1 text-xs text-destructive">{itemErrors[index]}</p>
            ) : null}
          </InsetListItem>
        )) : (
          <InsetListItem>
            <p className="text-xs text-tertiary-foreground">{emptyMessage}</p>
          </InsetListItem>
        )}
      </InsetList>

      <Drawer
        direction="right"
        open={draft !== null && !disabled}
        onOpenChange={open => { if (!open) setDraft(null); }}
      >
        <DrawerContent
          className="w-[799px]"
          onCloseAutoFocus={event => {
            if (!triggerRef.current?.isConnected) return;
            event.preventDefault();
            triggerRef.current.focus();
          }}
        >
          <DrawerHeader>
            <DrawerTitle>{editing ? "Edit" : "Tambah"} {itemName}</DrawerTitle>
            <DrawerDescription>Tuliskan {itemName} yang ingin dicatat.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-2">
            <Label htmlFor={fieldId}>{itemLabel}</Label>
            <Textarea
              id={fieldId}
              value={draft?.text ?? ""}
              onChange={event => setDraft(current => current && { ...current, text: event.target.value })}
              rows={3}
              aria-required="true"
            />
          </DrawerBody>
          <DrawerFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>Batal</Button>
            <Button type="button" disabled={!draft?.text.trim()} onClick={save}>Simpan</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
