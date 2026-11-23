"use client";

import { FieldDescription, FieldHeading } from "@/components/ui/field";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PopoverSelectField } from "@/components/shared/design-system";
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
import type { ProfilePeriodProgress } from "@/lib/api/profile-periods";
import { WorkflowError, workflowError } from "./workflow-ui";
import type {
  AnnualCandidate,
  AnnualMember,
  AnnualMemberInput,
  AnnualProfile,
} from "@/lib/api/upr-workflow";

export function AnnualMemberDialog({
  selection,
  objectives,
  year,
  periods = [],
  startCorrection = false,
  pending,
  close,
  save,
}: {
  selection: {
    candidate: AnnualCandidate | undefined;
    member: AnnualMember | undefined;
  };
  objectives: AnnualProfile["objectives"];
  year: number;
  periods?: ProfilePeriodProgress[];
  startCorrection?: boolean;
  pending: boolean;
  close: () => void;
  save: (input: AnnualMemberInput) => Promise<void>;
}) {
  const { candidate, member } = selection;
  const [objectiveId, setObjective] = useState(
    objectives.some((item) => item.id === member?.objectiveId)
      ? (member?.objectiveId ?? "")
      : (candidate?.suggestedObjectiveId ?? ""),
  );
  const [effectiveFrom, setEffectiveFrom] = useState(member?.effectiveFrom ?? "");
  const [correction, setCorrection] = useState(startCorrection || Boolean(member?.historicalCorrection));
  const firstPeriod = correction && effectiveFrom ? periods.find((period) =>
    period.calendarEndsOn && effectiveFrom <= period.calendarEndsOn) : undefined;
  const [reason, setReason] = useState(member?.changeReason ?? "");
  const [error, setError] = useState("");
  const candidateIsNewer =
    /^\d{4}-Q[1-4]$/.test(candidate?.period ?? "") &&
    Number(candidate?.period.slice(0, 4)) > year;
  const canReassess = Boolean(candidate && !candidateIsNewer);
  const canUseLatest = Boolean(
    candidate && !candidateIsNewer && candidate.id !== member?.riskId,
  );
  const [assessment, setAssessment] = useState(
    member?.riskId ? "saved" : canUseLatest ? "latest" : "reassess",
  );
  const riskId = assessment === "saved" ? member?.riskId : candidate?.id;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) close();
      }}
    >
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>
            {startCorrection
              ? "Tambah risiko sebagai koreksi"
              : member?.riskId
                ? "Penilaian ulang"
                : "Siapkan penilaian untuk profil"}
          </DialogTitle>
          <DialogDescription>
            {member?.code ?? candidate?.code} ·{" "}
            {member?.title ?? candidate?.title}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!riskId || pending) return;
            setError("");
            try {
              await save({
                riskId,
                objectiveId: objectiveId || null,
                ...(correction ? { effectiveFrom } : {}),
                changeReason: reason,
                reassess: assessment === "reassess",
                historicalCorrection: correction,
              });
              close();
            } catch (cause) {
              setError(workflowError(cause));
            }
          }}
        >
          {!member?.riskId && !canReassess && !canUseLatest && (
            <WorkflowError
              message={
                candidateIsNewer
                  ? "Risiko ini sudah memiliki penilaian yang lebih baru dari tahun profil. Keluarkan dari draf jika tidak lagi sesuai."
                  : "Penilaian aktif untuk risiko ini tidak tersedia. Muat ulang profil atau keluarkan risiko dari draf jika sudah tidak aktif."
              }
            />
          )}
          <fieldset
            disabled={pending || (!member?.riskId && !canReassess && !canUseLatest)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="annual-assessment">Penilaian</Label>
              <PopoverSelectField
                id="annual-assessment"
                value={assessment}
                onValueChange={(value) => {
                  setAssessment(value);
                  if (value === "reassess") setCorrection(false);
                }}
                placeholder="Pilih asesmen"
                options={[
                  ...(member?.riskId
                    ? [{ value: "saved", label: "Asesmen dalam draf profil" }]
                    : []),
                  ...(canUseLatest
                    ? [{ value: "latest", label: "Gunakan versi terakhir" }]
                    : []),
                  ...(canReassess && !startCorrection
                    ? [{ value: "reassess", label: "Nilai ulang" }]
                    : []),
                ]}
              />
            </div>
            <div className="space-y-2">
              <FieldHeading>
                <Label htmlFor="annual-objective">
                  Sasaran {year} (opsional)
                </Label>
                {objectives.length === 0 && (
                  <p className="leading-4 text-sm text-muted-foreground">
                    Sasaran aktif belum tersedia. Profil tetap bisa difinalisasi
                    tanpa sasaran.
                  </p>
                )}
              </FieldHeading>
              <PopoverSelectField
                id="annual-objective"
                value={objectiveId || "unset"}
                onValueChange={(value) =>
                  setObjective(value === "unset" ? "" : value)
                }
                placeholder="Pilih sasaran"
                options={[
                  { value: "unset", label: "Pilih nanti" },
                  ...objectives.map((objective) => ({
                    value: objective.id,
                    label: objective.title,
                  })),
                ]}
              />
            </div>
            {(startCorrection || correction || periods.some((period) => period.scopeLocked)) && assessment !== "reassess" && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="annual-historical-correction"
                  checked={correction}
                  disabled={startCorrection}
                  aria-describedby="annual-historical-correction-help"
                  onCheckedChange={(checked) => setCorrection(checked === true)}
                />
                <FieldHeading>
                  <Label htmlFor="annual-historical-correction">Koreksi historis</Label>
                  <FieldDescription id="annual-historical-correction-help">
                    Koreksi dapat disertakan pada versi laporan semester yang baru. Cakupan pemantauan dan dokumen periode tetap tersimpan.
                  </FieldDescription>
                </FieldHeading>
              </div>
            )}
            {correction && (
              <div className="space-y-2">
                <Label htmlFor="annual-effective-from">Tanggal koreksi historis</Label>
                <Input
                  id="annual-effective-from"
                  type="date"
                  min={`${year}-01-01`}
                  max={`${year}-12-31`}
                  value={effectiveFrom}
                  required
                  aria-describedby={firstPeriod ? "annual-effective-period" : undefined}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                />
                {firstPeriod && (
                  <p id="annual-effective-period" className="text-xs text-muted-foreground">
                    {firstPeriod.label}{firstPeriod.scopeLocked && " · Cakupan terkunci"}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <FieldHeading>
                <Label htmlFor="annual-reason">Alasan perubahan atau koreksi</Label>
                <FieldDescription id="annual-reason-help">
                  Wajib diisi saat mengubah penilaian risiko yang sudah final.
                </FieldDescription>
              </FieldHeading>
              <Textarea
                id="annual-reason"
                aria-describedby="annual-reason-help"
                maxLength={2000}
                required={correction}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </fieldset>
          {error && <WorkflowError message={error} />}
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={close}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                pending ||
                !riskId ||
                (assessment === "reassess" && !canReassess)
              }
            >
              {assessment === "reassess"
                ? "Simpan & buka penilaian"
                : pending
                  ? "Menyimpan…"
                  : "Simpan perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
