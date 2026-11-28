"use client";

import { AlertCircle, CheckCircle2, ClipboardList } from "@/components/shared/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatRiskScore } from "@/lib/risk";
import { ActionButton } from "../actions/action-button";
import { FormFrame, FormPanel } from "../layout/form-container";

export function RiskCreationContext({ saveMessage, revisionVersion }: {
  revisionVersion?: number;
  saveMessage: string;
}) {
  return (
    <Alert variant="info" role="note" aria-label="Status draf risiko" className="w-fit max-w-full rounded-lg px-2.5 py-2 text-xs leading-4 has-[>svg]:gap-x-2">
      <AlertCircle aria-hidden="true" className="size-3.5" />
      <AlertTitle>Status draf risiko</AlertTitle>
      <AlertDescription className="flex flex-col gap-0.5 text-xs leading-4 [&_p:not(:last-child)]:mb-0">
        <p>{revisionVersion ? `Anda sedang mengedit draf versi v${revisionVersion}. Profil aktif tetap berlaku sampai revisi difinalisasi.` : "Risiko akan berlaku setelah finalisasi."}</p>
        <p role="status" aria-live="polite" className="empty:sr-only">{saveMessage}</p>
      </AlertDescription>
    </Alert>
  );
}

export function RiskFormReadiness<SectionId extends string>({ sections, onNavigate }: {
  sections: { id: SectionId; title: string; done: boolean; hint: string; progress: number }[];
  onNavigate: (id: SectionId) => void;
}) {
  const completed = sections.filter(section => section.done).length;
  const heading = (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <ClipboardList aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        Kelengkapan risiko
      </h2>
      <p role="status" className="text-xs tabular-nums text-muted-foreground">
        <span aria-hidden="true">{completed} / {sections.length}</span>
        <span className="sr-only">{completed} dari {sections.length} bagian siap difinalisasi</span>
      </p>
    </div>
  );
  const rows = (
    <ul className="space-y-0.5 p-2">
      {sections.map(section => (
        <li key={section.id}>
          <ActionButton
            type="button"
            variant="ghost"
            className="h-auto min-h-8 w-full justify-start whitespace-normal text-start"
            onClick={() => onNavigate(section.id)}
          >
            {section.done ? (
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-(--badge-green-foreground)" />
            ) : (
              <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" strokeWidth="1.5" className="stroke-border" />
                {section.progress > 0 ? (
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    pathLength="100"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={100}
                    strokeDashoffset={100 - section.progress}
                    transform="rotate(-90 8 8)"
                    className="stroke-workspace-data motion-safe:transition-[stroke-dashoffset]"
                  />
                ) : null}
              </svg>
            )}
            <span className="min-w-0 break-words">
              {section.title}
              <span className="sr-only">
                {section.done ? ". Lengkap." : `. Belum lengkap. ${section.progress}% lengkap. ${section.hint}`}
              </span>
            </span>
          </ActionButton>
        </li>
      ))}
    </ul>
  );

  return (
    <nav aria-label="Kelengkapan risiko">
      <FormFrame className="space-y-1">
        {heading}
        <FormPanel>{rows}</FormPanel>
      </FormFrame>
    </nav>
  );
}

export function RiskFinalizationReview({ score, target, level, mitigationCount }: {
  score: number; target: number; level: string; mitigationCount: number;
}) {
  return <div className="space-y-3 text-sm">
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
      <dt className="text-muted-foreground">Skor risiko</dt><dd>{formatRiskScore(score)} · {level}</dd>
      <dt className="text-muted-foreground">Target residual</dt><dd>{formatRiskScore(target)}</dd>
      <dt className="text-muted-foreground">Rencana penanganan</dt><dd>{mitigationCount}</dd>
    </dl>
    <p className="text-muted-foreground">Risiko menjadi profil resmi setelah finalisasi. Tugas laporan penanganan disiapkan sesuai rencana dan jadwal yang ditetapkan.</p>
  </div>;
}
