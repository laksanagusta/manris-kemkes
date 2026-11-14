"use client";

import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  WorkingPaperContent,
  EvaluationContent,
} from "@/components/upr/supporting-document-content";
import { FinalReportFields } from "@/components/upr/final-report-fields";
import {
  periodLabel,
  WorkflowError,
  workflowError,
  workflowTime,
} from "@/components/upr/workflow-ui";
import { useAuth } from "@/contexts/auth-context";
import {
  reportKindLabel,
  uprApi,
  type EvaluationSnapshot,
  type ReportDetail,
  type WorkingPaperSnapshot,
} from "@/lib/api/upr-workflow";

export default function LaporanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [dialog, setDialog] = useState<"send" | "accept" | "changes" | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    setError("");
    uprApi
      .detail(token, id)
      .then((report) => {
        if (!ignore) setDetail(report);
      })
      .catch((cause) => {
        if (!ignore) setError(workflowError(cause));
      });
    return () => {
      ignore = true;
    };
  }, [token, id, retry]);

  async function submit() {
    if (!token || !detail || !dialog || pending) return;
    setPending(true);
    try {
      if (dialog === "send") {
        await uprApi.send(token, detail.id);
        toast.success("Laporan dikirim ke UPR-T.I.");
      } else if (detail.deliveryId) {
        await uprApi.resolve(
          token,
          detail.deliveryId,
          dialog === "accept" ? "accepted" : "changes_requested",
          note,
        );
        toast.success(
          dialog === "accept"
            ? "Penerimaan laporan dicatat."
            : "Permintaan perbaikan dicatat.",
        );
      }
      setNote("");
      setDialog(null);
      setRetry((value) => value + 1);
    } catch (cause) {
      toast.error(workflowError(cause));
    } finally {
      setPending(false);
    }
  }

  const report = detail?.id === id ? detail : null;
  const canResolve =
    report &&
    report.recipientId === user?.organizationId &&
    report.deliveryId &&
    !report.resolution;
  const canSend =
    report &&
    report.kind === "semester" &&
    report.organizationId === user?.organizationId &&
    !report.deliveryId;
  const label =
    dialog === "send"
      ? "Kirim ke UPR-T.I"
      : dialog === "accept"
        ? "Terima laporan"
        : "Minta perbaikan";

  return (
    <PageStack className="mx-auto max-w-6xl">
      <Button variant="ghost" asChild>
        <Link href="/laporan">Kembali ke Laporan</Link>
      </Button>
      {error ? (
        <WorkflowError
          message={error}
          retry={() => setRetry((value) => value + 1)}
        />
      ) : report ? (
        <>
          <CollectionPageHeader
            showTitle
            title={report.title || reportKindLabel[report.kind]}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">v{report.version}</Badge>
            <Badge variant="outline">
              {report.resolution === "accepted"
                ? "Diterima"
                : report.resolution === "changes_requested"
                  ? "Perlu perbaikan"
                  : report.sentAt
                    ? "Terkirim"
                    : "Final"}
            </Badge>
            <span>
              {periodLabel(report.period)} · {report.organization}
            </span>
            {report.previousVersionId && (
              <Link
                className="underline underline-offset-2"
                href={`/laporan/${report.previousVersionId}`}
              >
                Versi sebelumnya
              </Link>
            )}
          </div>
          {(report.sentAt || canResolve || canSend) && (
            <section
              aria-label="Riwayat pengiriman"
              className="space-y-2 text-sm"
            >
              {report.sentAt && (
                <p>
                  Dikirim oleh {report.senderName || report.organization} ke{" "}
                  {report.recipient} · {workflowTime(report.sentAt)}
                </p>
              )}
              {report.resolvedAt && (
                <p>
                  {report.resolution === "accepted"
                    ? "Diterima oleh"
                    : "Perbaikan diminta oleh"}{" "}
                  {report.resolverName || report.recipient} ·{" "}
                  {workflowTime(report.resolvedAt)}
                </p>
              )}
              {report.note && (
                <p className="whitespace-pre-wrap rounded-(--surface-radius) bg-muted p-3">
                  {report.note}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {canSend && (
                  <Button disabled={pending} onClick={() => setDialog("send")}>
                    Kirim ke UPR-T.I
                  </Button>
                )}
                {canResolve && (
                  <>
                    <Button
                      disabled={pending}
                      onClick={() => setDialog("accept")}
                    >
                      Terima laporan
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => setDialog("changes")}
                    >
                      Minta perbaikan
                    </Button>
                  </>
                )}
              </div>
            </section>
          )}
          {report.kind === "semester" ? (
            <FinalReportFields report={report} />
          ) : report.kind === "working_paper" ? (
            <WorkingPaperContent
              paper={report.snapshot as WorkingPaperSnapshot}
            />
          ) : (
            <EvaluationContent
              evaluation={report.snapshot as EvaluationSnapshot}
            />
          )}
        </>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat laporan…
        </p>
      )}
      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open && !pending) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}?</DialogTitle>
            <DialogDescription>Periksa versi laporan sebelum melanjutkan.</DialogDescription>
          </DialogHeader>
          <ConfirmationConsequences>
            {dialog === "send" ? "Versi laporan yang sedang dibuka akan dikirim ke UPR-T.I dan tercatat sebagai laporan terkirim." : dialog === "accept" ? "Laporan akan ditandai diterima. Keputusan penerimaan dicatat untuk versi dokumen ini." : "Laporan akan ditandai perlu perbaikan. Catatan perbaikan disimpan bersama keputusan untuk versi dokumen ini."}
          </ConfirmationConsequences>
          {dialog === "changes" && (
            <div className="space-y-1.5">
              <Label htmlFor="report-changes-note">Catatan perbaikan</Label>
              <Textarea
                id="report-changes-note"
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={pending}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setDialog(null)}
            >
              Batal
            </Button>
            <Button
              disabled={pending || (dialog === "changes" && !note.trim())}
              onClick={() => void submit()}
            >
              {label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
