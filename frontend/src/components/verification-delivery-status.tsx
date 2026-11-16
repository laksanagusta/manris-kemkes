"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  getVerificationDelivery,
  type VerificationDeliveryStatus,
  type VerificationResendResult,
} from "@/lib/api/auth";
import { getVerificationResendFeedback } from "@/lib/verification-resend-feedback";

const messages = {
  queued: ["Permintaan pengiriman diterima", "Tautan verifikasi menunggu pengiriman."],
  sending: ["Email sedang dikirim", "Status diperbarui setelah layanan email merespons."],
  retrying: ["Pengiriman akan dicoba lagi", "Ada gangguan saat mengirim email. Sistem akan mencoba lagi secara otomatis."],
  accepted: ["Layanan email menerima pengiriman", "Periksa kotak masuk dan folder spam. Tautan berlaku 30 menit sejak diterbitkan."],
  failed: ["Email verifikasi gagal dikirim", "Minta tautan baru atau hubungi Super Admin jika pengiriman tetap gagal."],
  cancelled: ["Pengiriman dibatalkan", "Jika email Anda belum terverifikasi, minta tautan baru."],
} satisfies Record<VerificationDeliveryStatus, [string, string]>;

export function VerificationDeliveryAlert({
  status,
  description,
  children,
}: {
  status: VerificationDeliveryStatus;
  description?: string;
  children?: ReactNode;
}) {
  const [title, defaultDescription] = messages[status];
  return (
    <Alert role="status" variant={status === "failed" ? "destructive" : "default"}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description ?? defaultDescription}</p>
        {children}
      </AlertDescription>
    </Alert>
  );
}

export function VerificationResendAlert({ outcome, retryAt }: VerificationResendResult) {
  if (!outcome) return null;
  const feedback = getVerificationResendFeedback(outcome, retryAt);

  return (
    <Alert role="status" variant={outcome === "unavailable" ? "destructive" : "default"}>
      <AlertTitle>{feedback.title}</AlertTitle>
      {feedback.retryTime ? (
        <AlertDescription>
          Coba lagi pada <time dateTime={feedback.retryTime.value}>{feedback.retryTime.label}</time>.
        </AlertDescription>
      ) : feedback.description && (
        <AlertDescription>{feedback.description}</AlertDescription>
      )}
    </Alert>
  );
}

export function VerificationDeliveryStatusPanel({
  deliveryId,
  children,
}: {
  deliveryId: string;
  children?: ReactNode;
}) {
  const [status, setStatus] = useState<VerificationDeliveryStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function refresh() {
      try {
        const result = await getVerificationDelivery(deliveryId, controller.signal);
        if (controller.signal.aborted) return;
        setStatus(result.status);
        if (result.status === "queued" || result.status === "sending" || result.status === "retrying") {
          timer = setTimeout(refresh, result.status === "retrying" ? 15_000 : 6_000);
        }
      } catch {
        if (!controller.signal.aborted) setUnavailable(true);
      }
    }

    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [attempt, deliveryId]);

  if (unavailable) {
    return (
      <Alert role="status">
        <AlertTitle>Status pengiriman belum tersedia</AlertTitle>
        <AlertDescription>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            setUnavailable(false);
            setAttempt((current) => current + 1);
          }}>
            Cek status lagi
          </Button>
          {children}
        </AlertDescription>
      </Alert>
    );
  }
  if (status) return <VerificationDeliveryAlert status={status}>{children}</VerificationDeliveryAlert>;
  return (
    <Alert role="status">
      <AlertDescription>Memeriksa status pengiriman email…</AlertDescription>
    </Alert>
  );
}
