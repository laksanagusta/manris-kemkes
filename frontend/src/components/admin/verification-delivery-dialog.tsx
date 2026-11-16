"use client";

import { useEffect, useState } from "react";
import { VerificationDeliveryAlert, VerificationResendAlert } from "@/components/verification-delivery-status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import {
  getAdminVerificationDelivery,
  retryAdminVerificationDelivery,
  type AdminVerificationDelivery,
  type VerificationResendResult,
} from "@/lib/api/auth";
import type { UserListItem } from "@/lib/api/users";

const failureDetails: Record<NonNullable<AdminVerificationDelivery["failure"]>, string> = {
  temporary: "Layanan email mengalami gangguan sementara.",
  recipient: "Layanan email menolak alamat penerima. Periksa alamat pendaftar sebelum mencoba lagi.",
  configuration: "Layanan email menolak konfigurasi pengiriman. Periksa konfigurasi SMTP sebelum mencoba lagi.",
  permanent: "Layanan email menolak pengiriman. Periksa konfigurasi dan alamat penerima sebelum mencoba lagi.",
};

export function VerificationDeliveryDialog({ user, token, onClose }: {
  user: UserListItem;
  token: string;
  onClose: () => void;
}) {
  const [delivery, setDelivery] = useState<(AdminVerificationDelivery & VerificationResendResult) | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = loading || retrying;
  const canRetry = delivery && ["accepted", "failed", "cancelled", "unknown"].includes(delivery.status);
  const resendResult = busy || error ? null : delivery;

  useEffect(() => {
    const controller = new AbortController();
    getAdminVerificationDelivery(user.id, token, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDelivery(result);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setDelivery(null);
          setError(err instanceof ApiError ? err.message : "Status pengiriman belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, token, user.id]);

  function refresh() {
    setLoading(true);
    setError("");
    setRevision((current) => current + 1);
  }

  async function retry() {
    if (busy || !canRetry) return;
    setError("");
    setRetrying(true);
    try {
      setDelivery(await retryAdminVerificationDelivery(user.id, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Permintaan pengiriman belum dapat dipastikan. Muat ulang status.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !retrying) onClose(); }}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={(event) => {
        const trigger = document.getElementById(`user-actions-${user.id}`);
        if (!trigger) return;
        event.preventDefault();
        trigger.focus();
      }}>
        <DialogHeader>
          <DialogTitle>Pengiriman verifikasi email</DialogTitle>
          <DialogDescription>{user.name}{user.email ? ` · ${user.email}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {resendResult && <VerificationResendAlert outcome={resendResult.outcome} retryAt={resendResult.retryAt} />}
          {loading ? (
            <p role="status" className="text-sm text-muted-foreground">Memuat status pengiriman…</p>
          ) : delivery?.status === "unknown" ? (
            resendResult?.outcome !== "unavailable" && <Alert role="status"><AlertDescription>Belum ada riwayat pengiriman untuk registrasi ini.</AlertDescription></Alert>
          ) : delivery ? (
            <VerificationDeliveryAlert
              status={delivery.status}
              description={delivery.failure ? failureDetails[delivery.failure] : delivery.status === "failed"
                ? "Periksa pengiriman sebelum meminta tautan baru."
                : undefined}
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={retrying}>Tutup</Button>
          <Button type="button" variant="outline" onClick={refresh} disabled={busy}>Muat ulang status</Button>
          {canRetry && (
            <Button type="button" onClick={retry} disabled={busy} aria-busy={retrying}>
              {retrying && <Spinner data-icon="inline-start" aria-hidden="true" />}
              {retrying ? "Memproses…" : "Kirim ulang tautan"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
