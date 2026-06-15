import type { WorkingPaper, WorkingPaperSignatory } from "@/types/working-paper";

export type WorkingPaperActionTone = "attention" | "neutral" | "success" | "danger";

export type WorkingPaperCurrentAction = {
  tone: WorkingPaperActionTone;
  title: string;
  description: string;
  buttonLabel?: string;
};

export type WorkingPaperTimelineItem = {
  signatory: WorkingPaperSignatory;
  state: "signed" | "current" | "upcoming" | "skipped";
  isActionOwner: boolean;
  label: string;
  description: string;
};

export type WorkingPaperDetailViewModel = {
  nextSignatory: WorkingPaperSignatory | null;
  canStartSigning: boolean;
  canSign: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canSkipTTE: boolean;
  tteSkipped: boolean;
  monitoringBlockers: string[];
  currentAction: WorkingPaperCurrentAction | null;
  timeline: WorkingPaperTimelineItem[];
};

function getNextSignatory(workingPaper: WorkingPaper): WorkingPaperSignatory | null {
  return (
    workingPaper.signatories.find(
      (signatory) =>
        signatory.sequence_no === workingPaper.current_signatory_sequence + 1 &&
        signatory.status === "pending",
    ) ?? null
  );
}

function getMonitoringBlockers(workingPaper: WorkingPaper): string[] {
  const risks = workingPaper.risks ?? [];
  const hasMonitoring = risks.some((link) => link.risk.monitoring);
  if (!hasMonitoring) {
    return [];
  }

  return risks
    .filter((link) => !link.risk.monitoring || link.risk.monitoring.status !== "finalized")
    .map((link) => {
      const status =
        link.risk.monitoring?.status === "draft"
          ? "Draft"
          : link.risk.monitoring?.status === "finalized"
            ? "Final"
            : "Missing";
      return `${link.risk.code} (${status})`;
    });
}

function buildCurrentAction(
  workingPaper: WorkingPaper,
  nextSignatory: WorkingPaperSignatory | null,
  canStartSigning: boolean,
  canSign: boolean,
  canSkipTTE: boolean,
  allRisksApproved: boolean,
  monitoringBlockers: string[],
  tteSkipped: boolean,
): WorkingPaperCurrentAction | null {
  if (workingPaper.status === "cancelled") {
    return {
      tone: "danger" as const,
      title: "Kertas kerja dibatalkan",
      description: "Proses dihentikan. Dokumen ini tidak dapat dilanjutkan.",
    };
  }

  if (workingPaper.status === "completed" && tteSkipped) {
    return {
      tone: "success" as const,
      title: "TTE dilewati",
      description: "Dokumen selesai tanpa tanda tangan elektronik.",
    };
  }

  if (workingPaper.status === "completed") {
    return {
      tone: "success" as const,
      title: "Seluruh tanda tangan selesai",
      description: "Dokumen sudah final dan siap dipakai sebagai arsip.",
    };
  }

  if (canStartSigning) {
    return {
      tone: "attention" as const,
      title: "Siap ditandatangani",
      description: "Periksa kembali isi dokumen lalu mulai proses tanda tangan elektronik.",
      buttonLabel: "Mulai proses TTE",
    };
  }

  if (canSign) {
    return {
      tone: "attention" as const,
      title: "Tindakan Anda diperlukan",
      description: "Anda penandatangan aktif. Periksa isi dokumen lalu tandatangani.",
      buttonLabel: "Tanda tangani sekarang",
    };
  }

  if (monitoringBlockers.length > 0) {
    return {
      tone: "attention" as const,
      title: "Finalisasi monitoring terlebih dahulu",
      description: `Monitoring belum final untuk: ${monitoringBlockers.join(", ")}.`,
    };
  }

  if (canSkipTTE) {
    return {
      tone: "success" as const,
      title: "Dokumen siap diselesaikan",
      description: "Semua risiko sudah diproses. Anda bisa menyelesaikan dokumen tanpa tanda tangan elektronik.",
      buttonLabel: "Lewati tanda tangan elektronik",
    };
  }

  if (!allRisksApproved && nextSignatory) {
    return {
      tone: "neutral" as const,
      title: "Menunggu persetujuan risiko",
      description: "Risiko harus disetujui dulu sebelum tanda tangan dimulai.",
    };
  }

  if (nextSignatory) {
    return {
      tone: "neutral" as const,
      title: "Menunggu penandatangan aktif",
      description: `Menunggu tanda tangan ${nextSignatory.signer_name} pada urutan ${nextSignatory.sequence_no}.`,
    };
  }

  return {
    tone: "neutral" as const,
    title: "Dokumen siap ditinjau",
    description: "Periksa ringkasan dan susunan penandatangan untuk lanjut.",
  };
}

function buildTimelineItem(
  signatory: WorkingPaperSignatory,
  workingPaper: WorkingPaper,
  nextSignatory: WorkingPaperSignatory | null,
  currentUserId?: string | null,
  tteSkipped?: boolean,
): WorkingPaperTimelineItem {
  if (tteSkipped) {
    return {
      signatory,
      state: "skipped",
      isActionOwner: false,
      label: "TTE dilewati",
      description: "Penandatangan ini tidak melakukan tanda tangan elektronik. Kertas kerja selesai tanpa TTE.",
    };
  }

  const isSigned = signatory.status === "signed";
  const isCurrent = !isSigned && nextSignatory?.id === signatory.id;
  const isActionOwner = Boolean(isCurrent && currentUserId && signatory.user_id === currentUserId);

  if (isSigned) {
    return {
      signatory,
      state: "signed",
      isActionOwner: false,
      label: "Sudah ditandatangani",
      description: "Tahap ini telah selesai dan tercatat dalam riwayat penandatanganan.",
    };
  }

  if (isCurrent) {
    if (isActionOwner) {
      return {
        signatory,
        state: "current",
        isActionOwner: true,
        label: "Giliran Anda",
        description: "Periksa isi dokumen, lalu tandatangani ketika seluruh informasi sudah sesuai.",
      };
    }

    return {
      signatory,
      state: "current",
      isActionOwner: false,
      label: "Sedang ditinjau",
      description: `Tahap ini menunggu tindakan ${signatory.signer_name} sebagai penandatangan urutan ${signatory.sequence_no}.`,
    };
  }

  const previousSequence = Math.max(signatory.sequence_no - 1, workingPaper.current_signatory_sequence + 1);

  return {
    signatory,
    state: "upcoming",
    isActionOwner: false,
    label: "Menunggu giliran",
    description: `Tahap ini aktif setelah penandatangan urutan ${previousSequence} selesai.`,
  };
}

export function buildWorkingPaperDetailViewModel(
  workingPaper: WorkingPaper,
  currentUserId?: string | null,
): WorkingPaperDetailViewModel {
  const nextSignatory = getNextSignatory(workingPaper);
  const risks = workingPaper.risks ?? [];
  const allRisksApproved = risks.length > 0 && risks.every((link) => link.risk.status === "approved");
  const monitoringBlockers = getMonitoringBlockers(workingPaper);
  const tteSkipped = workingPaper.tte_skipped;
  const canSign = Boolean(
    currentUserId &&
      nextSignatory &&
      nextSignatory.user_id === currentUserId &&
      workingPaper.status === "signing" &&
      allRisksApproved &&
      monitoringBlockers.length === 0,
  );
  const canStartSigning = Boolean(
    currentUserId &&
      workingPaper.created_by === currentUserId &&
      workingPaper.status === "draft" &&
      allRisksApproved &&
      monitoringBlockers.length === 0 &&
      !tteSkipped,
  );
  const canSkipTTE = Boolean(
    currentUserId &&
      workingPaper.created_by === currentUserId &&
      workingPaper.status === "draft" &&
      allRisksApproved &&
      monitoringBlockers.length === 0 &&
      !tteSkipped,
  );

  return {
    nextSignatory,
    canStartSigning,
    canSign,
    canCancel: workingPaper.status === "draft" || workingPaper.status === "signing",
    canDelete: workingPaper.status === "draft",
    canSkipTTE,
    tteSkipped,
    monitoringBlockers,
    currentAction: buildCurrentAction(workingPaper, nextSignatory, canStartSigning, canSign, canSkipTTE, allRisksApproved, monitoringBlockers, tteSkipped),
    timeline: workingPaper.signatories.map((signatory) =>
      buildTimelineItem(signatory, workingPaper, nextSignatory, currentUserId, tteSkipped),
    ),
  };
}
