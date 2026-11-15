"use client";

import { FieldHeading } from "@/components/ui/field";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
            {member?.riskId
              ? "Ubah sasaran"
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
                effectiveFrom: "",
                changeReason: reason,
                reassess: assessment === "reassess",
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
              <Label htmlFor="annual-assessment">Asesmen</Label>
              <Select value={assessment} onValueChange={setAssessment}>
                <SelectTrigger id="annual-assessment" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {member?.riskId && (
                    <SelectItem value="saved">
                      Asesmen dalam draf profil
                    </SelectItem>
                  )}
                  {canUseLatest && (
                    <SelectItem value="latest">
                      Gunakan versi terakhir
                    </SelectItem>
                  )}
                  {canReassess && (
                    <SelectItem value="reassess">Nilai ulang</SelectItem>
                  )}
                </SelectContent>
              </Select>
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
              <Select
                value={objectiveId || "unset"}
                onValueChange={(value) =>
                  setObjective(value === "unset" ? "" : value)
                }
              >
                <SelectTrigger id="annual-objective" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Pilih nanti</SelectItem>
                  {objectives.map((objective) => (
                    <SelectItem value={objective.id} key={objective.id}>
                      {objective.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual-reason">
                Alasan perubahan atau koreksi
              </Label>
              <p className="leading-4 text-sm text-muted-foreground">
                Wajib diisi saat mengubah penilaian risiko yang sudah final.
              </p>
              <Textarea
                id="annual-reason"
                maxLength={2000}
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
