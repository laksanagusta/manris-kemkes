"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2 } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "./app-drawer";
import { ActionButton } from "./design-system/actions/action-button";
import { InsetList, InsetListItem } from "./design-system/layout/inset-list";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { IllustratedEmptyState, PopoverSelectField } from "@/components/shared/design-system";
import { MitigationPlanLedger } from "./mitigation-plan-ledger";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import type { MitigationItem } from "@/components/shared/mitigation-table";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";

const typeOptions = [
  { value: "reduce_probability", label: "Turunkan probabilitas" },
  { value: "reduce_impact", label: "Turunkan dampak" },
  { value: "reduce_both", label: "Turunkan probabilitas dan dampak" },
] as const;

type Props = {
  presentation?: "list" | "table";
  beforeAdd?: ReactNode;
  items: MitigationItem[];
  onChange: (items: MitigationItem[]) => void;
  disabled?: boolean;
  actionErrors?: Array<string | undefined>;
  showPlaceholders?: boolean;
  emptyStatePresentation?: "illustrated" | "plain";
  hideAddButton?: boolean;
  loadPicOptions?: (params: { q: string; page: number; limit: number }) => Promise<{
    options: UserPickerOption[]; total: number; page: number; limit: number;
  }>;
};

export function MitigationPlanList({
  presentation = "list",
  beforeAdd,
  items,
  onChange,
  disabled,
  actionErrors,
  showPlaceholders = true,
  emptyStatePresentation = "illustrated",
  hideAddButton = false,
  loadPicOptions,
}: Props) {
  const fieldId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<MitigationItem>({ action: "", owner: "", mitigationType: "reduce_probability" });
  const picId = draft.ownerUserId ?? draft.treatmentOwnerId ?? draft.externalPicId ?? draft.owner;
  const valid = Boolean(draft.action.trim() && picId?.trim());

  const begin = (index: number | null) => {
    setEditingIndex(index);
    setDraft(index === null ? {
      action: "",
      owner: user?.name ?? "",
      ownerUserId: user?.id,
      treatmentOwnerId: user?.id,
      mitigationType: "reduce_probability",
    } : { ...items[index] });
    setOpen(true);
  };
  const save = () => {
    if (!valid || disabled) return;
    const saved = { ...draft, action: draft.action.trim() };
    onChange(editingIndex === null ? [...items, saved] : items.map((item, index) => index === editingIndex ? saved : item));
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      {presentation === "table" ? (
        <MitigationPlanLedger items={items} disabled={disabled} hideAddButton={hideAddButton} actionErrors={actionErrors} onEdit={begin} onRemove={(index) => onChange(items.filter((_, i) => i !== index))} />
      ) : (
        <>
          {!hideAddButton && !disabled ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {beforeAdd}
              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={event => {
                  triggerRef.current = event.currentTarget;
                  begin(null);
                }}
              >
                Tambah Rencana Penanganan
              </ActionButton>
            </div>
          ) : null}
          {!items.length && emptyStatePresentation === "illustrated" ? (
            <IllustratedEmptyState title="Belum ada rencana mitigasi." description="Tambahkan rencana mitigasi untuk mulai mencatat penanganan risiko." />
          ) : (
            <InsetList aria-label="Rencana mitigasi">
              {items.length ? items.map((item, index) => {
                const type = typeOptions.find(option => option.value === (item.mitigationType ?? "reduce_probability"));
                return (
                  <InsetListItem
                    key={item.id ?? index}
                    action={!disabled ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit rencana mitigasi ${index + 1}`}
                          onClick={event => {
                            triggerRef.current = event.currentTarget;
                            begin(index);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Hapus rencana mitigasi ${index + 1}`}
                          onClick={() => onChange(items.filter((_, i) => i !== index))}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ) : undefined}
                  >
                    <p className="whitespace-pre-wrap wrap-break-word text-sm text-secondary-foreground">
                      {item.action || "Rencana belum diisi"}
                    </p>
                    <p className="mt-1 wrap-break-word text-xs text-muted-foreground">
                      {item.owner || "PIC belum dipilih"}{type ? ` · ${type.label}` : null}
                    </p>
                    {actionErrors?.[index] ? <p role="alert" className="mt-1 text-xs text-destructive">{actionErrors[index]}</p> : null}
                  </InsetListItem>
                );
              }) : (
                <InsetListItem>
                  <p className="text-xs text-tertiary-foreground">Belum ada rencana mitigasi.</p>
                </InsetListItem>
              )}
            </InsetList>
          )}
        </>
      )}
      <Drawer direction="right" open={open && !disabled} onOpenChange={setOpen}>
        <DrawerContent
          className="w-[799px]"
          data-mitigation-plan-drawer=""
          onCloseAutoFocus={event => {
            if (!triggerRef.current?.isConnected) return;
            event.preventDefault();
            triggerRef.current.focus();
          }}
        >
          <DrawerHeader>
            <DrawerTitle>{editingIndex === null ? "Tambah rencana penanganan" : "Edit rencana penanganan"}</DrawerTitle>
            <DrawerDescription>Isi rencana penanganan, PIC, dan tipe mitigasi.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody>
            <FieldGroup>
              <Field><FieldLabel htmlFor={`${fieldId}-action`}>Rencana penanganan <span className="text-destructive">*</span></FieldLabel><Textarea id={`${fieldId}-action`} value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} placeholder={showPlaceholders ? "Uraian rencana penanganan" : undefined} rows={3} aria-required="true" /></Field>
              <Field>
                {loadPicOptions ? <>
                  <FieldLabel>PIC <span className="text-destructive">*</span></FieldLabel>
                  <RemoteUserPicker title="Pilih PIC" description="Cari dan pilih PIC untuk rencana penanganan ini" placeholder="Pilih PIC" emptyMessage="Tidak ada user ditemukan." value={picId ? { id: picId, name: draft.owner || picId } : null} onSelect={(option) => setDraft({ ...draft, ownerUserId: option.id, treatmentOwnerId: option.id, externalPicId: undefined, owner: option.name })} presentation="assignee" loadOptions={loadPicOptions} />
                </> : <><FieldLabel htmlFor={`${fieldId}-owner`}>PIC <span className="text-destructive">*</span></FieldLabel><Input id={`${fieldId}-owner`} value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value, ownerUserId: undefined, treatmentOwnerId: undefined, externalPicId: undefined })} required /></>}
              </Field>
              <Field><FieldLabel htmlFor={`${fieldId}-type`}>Tipe mitigasi</FieldLabel>
                <PopoverSelectField
                  id={`${fieldId}-type`}
                  value={draft.mitigationType ?? "reduce_probability"}
                  onValueChange={(value) => setDraft({ ...draft, mitigationType: value as MitigationItem["mitigationType"] })}
                  options={typeOptions}
                  placeholder="Pilih tipe mitigasi"
                  ariaLabel="Tipe mitigasi"
                />
              </Field>
            </FieldGroup>
          </DrawerBody>
          <DrawerFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="button" disabled={!valid} onClick={save}>Simpan</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
