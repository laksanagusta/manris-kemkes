"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "@/components/ui/icons";
import {
  AccentButton,
  CollectionDialogCancel,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldErrorMessage,
  Input,
  PopoverSelectField,
  Textarea,
} from "@/components/shared/design-system";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { buildRiskRegisterPayload } from "@/lib/risk-register-payload";
import { currentAssessmentCycle } from "@/lib/risk-cycle-options";
import { riskCategoryLabels } from "@/lib/risk";
import type { RiskCategory } from "@/types/risk";
import type { Finding } from "@/types/document-processing";

const riskCategoryValues: RiskCategory[] = [
  "kebijakan",
  "reputasi",
  "fraud_korupsi",
  "legal",
  "kepatuhan",
  "operasional",
];
const riskCategoryOptions: Array<{ value: RiskCategory; label: string }> =
  riskCategoryValues.map((value) => ({ value, label: riskCategoryLabels[value] }));

function normalizeCategory(value: string | undefined): RiskCategory {
  const normalized = value?.trim().toLowerCase() ?? "";
  const directMatch = riskCategoryOptions.find(
    (option) => option.value === normalized,
  );
  if (directMatch) return directMatch.value;

  const labelMatch = riskCategoryOptions.find(
    (option) => option.label.toLowerCase() === normalized,
  );
  return labelMatch?.value ?? "operasional";
}

type RiskDraftDialogProps = {
  finding: Finding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken?: string;
  organizationId?: string;
  userRole?: string;
  onSaved: (findingId: string) => void;
};

export function RiskDraftDialog({
  finding,
  open,
  onOpenChange,
  authToken,
  organizationId,
  userRole,
  onSaved,
}: RiskDraftDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RiskCategory>("operasional");
  const [submitting, setSubmitting] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!finding || !open) return;
    setTitle(finding.title.trim());
    const summary = finding.summary.trim();
    const recommendation = finding.recommendedAction.trim();
    setDescription(
      [
        summary,
        recommendation ? `Tindakan yang disarankan: ${recommendation}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
    setCategory(normalizeCategory(finding.category));
    setShowValidationErrors(false);
  }, [finding, open]);

  const errors = useMemo(
    () => ({
      title:
        title.trim().length < 3 ? "Judul risiko minimal 3 karakter" : "",
      description:
        description.trim().length < 10
          ? "Deskripsi minimal 10 karakter"
          : "",
      category: category ? "" : "Kategori risiko wajib dipilih",
    }),
    [category, description, title],
  );
  const hasErrors = Boolean(errors.title || errors.description || errors.category);

  async function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!finding) return;
    if (hasErrors) {
      setShowValidationErrors(true);
      window.requestAnimationFrame(() => {
        if (errors.title) titleInputRef.current?.focus();
      });
      return;
    }
    if (!authToken) {
      toast.error("Sesi Anda telah berakhir. Masuk kembali untuk menyimpan draft.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildRiskRegisterPayload(
        {
          title: title.trim(),
          description: description.trim(),
          category,
          organizationId,
          causes: [],
          impacts: [],
          riskSource: "internal",
          controllability: "C",
          existingControl: "",
          controlEffectiveness: "",
          probability: 3,
          impact: 3,
          weight: 1,
          riskPriority: 0,
          riskAppetite: "dalam_batas",
          treatmentOption: "mitigate",
          targetProbability: 1,
          targetImpact: 1,
          targetWeight: 1,
          mitigations: [],
        },
        "draft",
        {
          assessmentCycle: currentAssessmentCycle(),
          userRole,
          userOrganizationId: organizationId,
        },
      );
      await api.post("/risks", payload, authToken);
      toast.success("Draft risiko berhasil disimpan.");
      onSaved(finding.id);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Draft risiko gagal disimpan. Coba lagi.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg no-scrollbar" showCloseButton={false}>
        <form onSubmit={submitDraft} className="flex min-h-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="text-base">Buat draf risiko</DialogTitle>
            <DialogDescription>
              Tinjau tiga informasi minimum sebelum menyimpan risiko sebagai draft.
            </DialogDescription>
          </DialogHeader>

          {finding ? (
            <p className="-mt-1 text-xs leading-5 text-muted-foreground">
              Sumber: {finding.source.documentName} · halaman {finding.source.pageNumber}
            </p>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-risk-draft-title">
                Judul <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={titleInputRef}
                id="document-risk-draft-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => setShowValidationErrors(true)}
                aria-invalid={showValidationErrors && Boolean(errors.title)}
                placeholder="Contoh: Keterlambatan distribusi obat"
                autoFocus
              />
              {showValidationErrors ? (
                <FieldErrorMessage>{errors.title}</FieldErrorMessage>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-risk-draft-description">
                Deskripsi <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="document-risk-draft-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => setShowValidationErrors(true)}
                aria-invalid={showValidationErrors && Boolean(errors.description)}
                placeholder="Jelaskan kondisi risiko yang ditemukan."
                className="min-h-28 resize-y"
              />
              {showValidationErrors ? (
                <FieldErrorMessage>{errors.description}</FieldErrorMessage>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-risk-draft-category">
                Kategori <span className="text-destructive">*</span>
              </Label>
              <PopoverSelectField
                id="document-risk-draft-category"
                value={category}
                onValueChange={(value) => setCategory(value as RiskCategory)}
                options={riskCategoryOptions}
                placeholder="Pilih kategori risiko"
                invalid={showValidationErrors && Boolean(errors.category)}
              />
              {showValidationErrors ? (
                <FieldErrorMessage>{errors.category}</FieldErrorMessage>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <CollectionDialogCancel
              type="button"
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </CollectionDialogCancel>
            <AccentButton
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              icon={
                submitting ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Save className="size-3" />
                )
              }
            >
              {submitting ? "Menyimpan..." : "Simpan draft"}
            </AccentButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
