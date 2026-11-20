"use client";

import { useId, useRef, type ComponentProps } from "react";
import { canSubmitRiskRevision, type RiskRevisionChange } from "@/lib/risk-revision-review";
import {
  Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/shared/app-drawer";
import { Button } from "@/components/ui/button";
import { FieldHeading } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RiskRevisionReviewDrawer({
  open, onOpenChange, onConfirm, onCloseAutoFocus, riskCode, version, changes,
  reason, onReasonChange, pending = false, error, requiresApproval = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCloseAutoFocus?: ComponentProps<typeof DrawerContent>["onCloseAutoFocus"];
  riskCode: string;
  version: number | null;
  changes: RiskRevisionChange[] | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  pending?: boolean;
  error?: string;
  requiresApproval?: boolean;
}) {
  const id = useId();
  const titleRef = useRef<HTMLDivElement>(null);
  const canConfirm = canSubmitRiskRevision(changes, reason);

  return (
    <Drawer open={open} dismissible={!pending} onOpenChange={onOpenChange}>
      <DrawerContent
        className="w-[640px]"
        showCloseButton={false}
        onOpenAutoFocus={event => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DrawerHeader className="pr-5">
          <div ref={titleRef} tabIndex={-1} className="space-y-1 outline-none">
            <DrawerTitle>Tinjau revisi risiko</DrawerTitle>
            <p className="wrap-break-word text-xs text-muted-foreground">
              {[riskCode, version && `Versi v${version}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <DrawerDescription>Periksa perubahan profil dan alasan revisi sebelum melanjutkan.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-5">
          <section aria-labelledby={`${id}-summary`} className="space-y-3">
            <h3 id={`${id}-summary`} className="font-medium">Ringkasan perubahan</h3>
            {changes?.length ? (
              <ul className="space-y-2">
                {changes.map(({ field, label, before, after }) => (
                  <li key={field} className="overflow-hidden rounded-lg border border-border">
                    <h4 className="bg-muted px-3 py-2 text-sm font-medium">{label}</h4>
                    <dl className="space-y-1 p-2 text-sm">
                      <div className="flex items-start gap-2 rounded-md bg-(--badge-red-surface) px-2.5 py-1.5 text-(--badge-red-foreground)">
                        <dt className="shrink-0 font-medium"><span aria-hidden="true">− </span>Sebelum</dt>
                        <dd className="min-w-0 whitespace-pre-wrap wrap-break-word">{before}</dd>
                      </div>
                      <div className="flex items-start gap-2 rounded-md bg-(--badge-green-surface) px-2.5 py-1.5 text-(--badge-green-foreground)">
                        <dt className="shrink-0 font-medium"><span aria-hidden="true">+ </span>Sesudah</dt>
                        <dd className="min-w-0 whitespace-pre-wrap wrap-break-word">{after}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                {changes
                  ? "Belum ada perubahan pada profil. Lanjutkan edit dan ubah minimal satu data profil."
                  : "Versi pembanding tidak tersedia. Muat ulang halaman untuk mencoba lagi."}
              </p>
            )}
          </section>
          <div className="space-y-2 border-t border-border pt-5">
            <FieldHeading>
              <Label htmlFor={`${id}-reason`}>Alasan revisi</Label>
              <p id={`${id}-hint`} className="text-xs leading-4 text-muted-foreground">
                Minimal 10 karakter. Alasan disimpan dalam riwayat versi.
              </p>
            </FieldHeading>
            <Textarea
              id={`${id}-reason`}
              aria-describedby={`${id}-hint`}
              value={reason}
              onChange={event => onReasonChange(event.target.value)}
              minLength={10}
              maxLength={1000}
              required
              rows={4}
              disabled={pending}
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </DrawerBody>
        <DrawerFooter className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Lanjutkan edit
          </Button>
          <Button type="button" disabled={!canConfirm || pending} aria-busy={pending} onClick={onConfirm}>
            {pending ? "Memproses…" : requiresApproval ? "Ajukan untuk review" : "Finalisasi revisi"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
