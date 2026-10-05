"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy } from "@/components/shared/icons";
import type { OrganizationAPIKey } from "@/lib/api/organization-api-key";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function timestamp(value?: string | null) {
  return value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)) + " WIB" : "Belum digunakan";
}

export function APIKeyPanel({ metadata, secret, loading, pending, error, onGenerate, onDismissSecret, onRetry }: {
  metadata: OrganizationAPIKey | null;
  secret: string;
  loading: boolean;
  pending: boolean;
  error: string;
  onGenerate: () => void | Promise<boolean>;
  onDismissSecret: () => void;
  onRetry: () => void;
}) {
  const [dialogStep, setDialogStep] = useState<"closed" | "confirm" | "secret">("closed");
  const [modalContentElement, setModalContentElement] = useState<HTMLDivElement | null>(null);
  const [modalBodyContentElement, setModalBodyContentElement] = useState<HTMLDivElement | null>(null);
  const modalHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (dialogStep === "closed") {
      modalHeightRef.current = null;
      return;
    }

    const modal = modalContentElement;
    const bodyContent = modalBodyContentElement;
    if (!modal || !bodyContent) return;

    let frame = 0;
    let scheduled = false;

    const measureAndAnimate = () => {
      scheduled = false;
      if (!modal.isConnected) return;

      const previousHeight = modal.offsetHeight || modalHeightRef.current || 0;
      const previousHeightStyle = modal.style.height;
      const previousMaxHeightStyle = modal.style.maxHeight;
      const previousTransitionStyle = modal.style.transition;

      modal.style.transition = "none";
      modal.style.height = "auto";
      modal.style.maxHeight = "none";
      const targetHeight = Math.min(modal.offsetHeight, Math.max(0, window.innerHeight - 16));
      modal.style.height = previousHeightStyle;
      modal.style.maxHeight = previousMaxHeightStyle;
      modal.style.transition = previousTransitionStyle;

      if (!targetHeight) return;
      if (modalHeightRef.current === null || Math.abs(targetHeight - previousHeight) < 1) {
        modal.style.height = `${targetHeight}px`;
        modalHeightRef.current = targetHeight;
        return;
      }

      modal.style.height = `${previousHeight}px`;
      void modal.offsetHeight;
      modal.style.height = `${targetHeight}px`;
      modalHeightRef.current = targetHeight;
    };

    const scheduleMeasure = () => {
      if (scheduled) return;
      scheduled = true;
      frame = window.requestAnimationFrame(measureAndAnimate);
    };

    scheduleMeasure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(bodyContent);
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [dialogStep, modalContentElement, modalBodyContentElement]);

  async function generateAndReveal() {
    const succeeded = await onGenerate();
    if (succeeded !== false) setDialogStep("secret");
  }

  function closeDialog() {
    setDialogStep("closed");
    onDismissSecret();
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("API key disalin.");
    } catch {
      toast.error("Tidak dapat menyalin. Pilih dan salin API key secara manual.");
    }
  }

  return <section className="space-y-4" aria-label="API key organisasi" aria-busy={loading || pending}>
    {error && <Alert variant="destructive"><AlertTitle>API key tidak dapat dimuat</AlertTitle><AlertDescription>{error}</AlertDescription><div className="mt-2"><Button variant="outline" onClick={onRetry} disabled={pending}>Coba lagi</Button></div></Alert>}
    <Card><CardContent>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">API key</p>
            {loading ? <Skeleton className="h-5 w-48" /> : error ? <p className="text-sm text-muted-foreground">Status belum tersedia.</p> : <p className="break-all font-mono text-sm text-muted-foreground">{metadata ? `${metadata.prefix}••••••••••••` : "Belum dibuat"}</p>}
          </div>
          {!loading && !error && <Button variant="outline" disabled={pending || Boolean(secret)} onClick={() => metadata ? setDialogStep("confirm") : void generateAndReveal()}>
            {metadata ? "Regenerate" : "Generate"}
          </Button>}
        </div>
        {pending && <p role="status" className="text-sm text-muted-foreground">Menyimpan API key…</p>}
        {metadata && <>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium">Diperbarui</p>
            <p className="text-sm text-muted-foreground">{timestamp(metadata.updatedAt)}</p>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium">Terakhir digunakan</p>
            <p className="text-sm text-muted-foreground">{timestamp(metadata.lastUsedAt)}</p>
          </div>
        </>}
      </div>
    </CardContent></Card>
    <Dialog open={dialogStep !== "closed"} onOpenChange={(open) => {
      if (open) return;
      if (pending) return;
      closeDialog();
    }}>
      <DialogContent
        ref={setModalContentElement}
        data-dynamic-height="true"
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-md"
      >
        <div ref={setModalBodyContentElement} className="space-y-4">
          {dialogStep === "confirm" ? <>
            <DialogHeader>
              <DialogTitle>Regenerate API key?</DialogTitle>
              <DialogDescription>Key lama langsung tidak berlaku untuk seluruh integrasi organisasi ini. Semua aplikasi integrasi harus diperbarui dengan key baru.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" disabled={pending} onClick={closeDialog}>Batal</Button>
              <Button variant="destructive" disabled={pending} onClick={() => void generateAndReveal()}>
                {pending ? "Membuat…" : "Regenerate"}
              </Button>
            </DialogFooter>
          </> : <>
            <DialogHeader>
              <DialogTitle>API key baru siap</DialogTitle>
              <DialogDescription>Key lengkap ini hanya ditampilkan sekali. Salin dan simpan di server aplikasi integrasi Anda sebelum menutup modal.</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="generated-organization-api-key">API key baru</FieldLabel>
              <InputGroup>
                <InputGroupInput id="generated-organization-api-key" value={secret} readOnly autoFocus autoComplete="off" spellCheck={false} onFocus={(event) => event.currentTarget.select()} />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton aria-label="Salin API key" title="Salin API key" onClick={() => void copySecret()}>
                    <Copy aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Tutup</Button>
            </DialogFooter>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}
