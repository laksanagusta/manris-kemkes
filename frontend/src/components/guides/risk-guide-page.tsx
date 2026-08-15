import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  riskGuideContent,
  type RiskGuideContent,
} from "@/lib/risk-guide-content";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Circle,
  PlayCircle,
  RotateCcw,
} from "@/components/ui/icons";

type RiskGuidePageProps = {
  content?: RiskGuideContent;
  className?: string;
};

const STATUS_CONFIG = {
  draft: {
    label: "draft",
    icon: Circle,
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
  },
  final: {
    label: "final",
    icon: CheckCircle2,
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-400",
  },
};

function StatusPill({ status }: { status: string }) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider",
        config.bg,
        config.border,
        config.text,
      )}
    >
      <Icon className="size-2.5" />
      {config.label}
    </span>
  );
}

function FlowNode({
  label,
  status,
  isFirst,
  isLast,
}: {
  label: string;
  status: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
  STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-0">
      {!isFirst && (
        <div className="w-8 border-t border-dashed border-muted-foreground/20" />
      )}
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs",
            config.bg,
            config.border,
          )}
        >
          <Icon className={cn("size-3.5", config.text)} />
          <span className="text-foreground/80">{label}</span>
        </div>
      </div>
      {!isLast && (
        <div className="flex items-center justify-center w-6">
          <ArrowRight className="size-3 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}

function PhaseBlock({
  phase,
  steps,
  variant,
}: {
  phase: string;
  steps: { label: string; status: string }[];
  variant: "blue" | "purple";
}) {
  const variantStyles = {
    blue: "border-blue-500/20 bg-blue-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
  };

  return (
    <div
      className={cn("rounded-xl border p-4 space-y-3", variantStyles[variant])}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {phase}
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {steps.map((step, i) => (
          <FlowNode
            key={step.label}
            label={step.label}
            status={step.status}
            isFirst={i === 0}
            isLast={i === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function StepCard({
  step,
  index,
}: {
  step: (typeof riskGuideContent.steps)[number];
  index: number;
}) {
  const stepNum = String(index + 1).padStart(2, "0");
  const config =
    STATUS_CONFIG[step.status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <div className="group relative pb-8">
      {index < 5 && (
        <div className="absolute left-[11px] top-6 h-full w-px bg-border/40" />
      )}

      <div className="absolute left-0 top-0 flex size-6 items-center justify-center rounded-full border border-border/70 bg-background font-mono text-[10px] font-bold text-muted-foreground shadow-sm">
        {stepNum}
      </div>

      <div className="ml-10 rounded-xl bg-card/30 p-4 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30 transition-colors hover:bg-card/50">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <Icon className={cn("size-4", config.text)} />
            <h3 className="font-mono text-sm font-semibold text-foreground">
              {step.title}
            </h3>
          </div>
          <StatusPill status={step.status} />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {step.description}
        </p>

        <div className="space-y-1.5 border-t border-border/30 pt-3">
          {step.actions.map((action, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-muted-foreground/40 mt-0.5">
                →
              </span>
              <span className="text-foreground/70 font-mono">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RiskGuidePage({
  content = riskGuideContent,
  className,
}: RiskGuidePageProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8",
        className,
      )}
    >
      <section aria-labelledby="risk-guide-title">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <span>manris</span>
            <span className="text-border">/</span>
            <span>guide</span>
            <span className="text-border">/</span>
            <span className="text-foreground">
              Alur kerja pemantauan risiko
            </span>
          </div>

          <h1
            id="risk-guide-title"
            className="page-title"
          >
            {content.hero.title}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {content.hero.description}
          </p>

          <p className="text-xs text-muted-foreground/70 font-mono leading-relaxed max-w-2xl border-l-2 border-border pl-3 mt-2">
            {content.hero.summary}
          </p>
        </div>
      </section>

      <section aria-labelledby="risk-guide-video" className="space-y-3">
        <div className="flex items-center gap-2">
          <h2
            id="risk-guide-video"
            className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground"
          >
            video panduan
          </h2>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        <Card className="overflow-hidden bg-card/40">
          <CardHeader className="space-y-2 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                {content.video.title}
              </CardTitle>
            </div>
            <CardDescription className="text-xs leading-6 text-muted-foreground">
              {content.video.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="overflow-hidden rounded-xl border border-border/50 bg-black shadow-sm">
              <div className="aspect-video">
                <iframe
                  className="h-full w-full"
                  src={content.video.embedUrl}
                  title={content.video.title}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="leading-6">
                Jika video tidak tampil, buka langsung lewat YouTube.
              </p>
              <a
                href={content.video.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 transition hover:underline"
              >
                {content.video.label}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="risk-guide-documents" className="space-y-3">
        <div className="flex items-center gap-2">
          <h2
            id="risk-guide-documents"
            className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {content.documents.title}
          </h2>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {content.documents.description}
        </p>

        <div className="grid gap-4">
          {content.documents.items.map((document) => (
            <Card
              key={document.title}
              className="overflow-hidden bg-card/40"
            >
              <CardHeader className="space-y-2 border-b border-border/40 pb-4">
                <CardTitle className="text-sm font-semibold">
                  {document.title}
                </CardTitle>
                <CardDescription className="text-xs leading-6 text-muted-foreground">
                  {document.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
                  Buka dokumen di tab baru untuk membaca versi lengkapnya
                  langsung dari Google Drive.
                </p>
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 px-3 py-2 text-xs font-medium text-foreground transition hover:border-border hover:bg-muted/40"
                >
                  {document.label}
                  <ExternalLink className="size-3.5" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="risk-guide-flow" className="space-y-3">
        <div className="flex items-center gap-2">
          <h2
            id="risk-guide-flow"
            className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {content.flow.title}
          </h2>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        <div className="rounded-xl bg-card/30 p-4 space-y-3 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
          <PhaseBlock
            phase={content.flow.phase1}
            steps={[
              { label: "daftar", status: "draft" },
              { label: "finalisasi", status: "final" },
              { label: "aktif", status: "final" },
            ]}
            variant="blue"
          />

          <div className="flex items-center justify-center py-1">
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/50">
              <RotateCcw className="size-3" />
              <span>siklus pemantauan</span>
            </div>
          </div>

          <PhaseBlock
            phase={content.flow.phase2}
            steps={[
              { label: "mulai", status: "draft" },
              { label: "lanjutkan", status: "draft" },
              { label: "selesai", status: "final" },
            ]}
            variant="purple"
          />
        </div>
      </section>

      <section aria-labelledby="risk-guide-steps" className="space-y-4">
        <div className="flex items-center gap-2">
          <h2
            id="risk-guide-steps"
            className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground"
          >
            langkah detail
          </h2>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        <div className="space-y-0 pl-2">
          {content.steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </div>
      </section>

      <section aria-labelledby="risk-guide-faq" className="space-y-3">
        <div className="flex items-center gap-2">
          <h2
            id="risk-guide-faq"
            className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground"
          >
            faq
          </h2>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        <div className="rounded-xl bg-card/30 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30 divide-y divide-border/30">
          {content.faq.items.map((item) => (
            <div key={item.question} className="p-4 space-y-1.5">
              <dt className="text-xs font-mono font-semibold text-foreground">
                {item.question}
              </dt>
              <dd className="text-xs font-mono text-muted-foreground/70 leading-relaxed pl-3 border-l border-border/30">
                {item.answer}
              </dd>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between border-t border-border/30 pt-6 text-[10px] font-mono text-muted-foreground/50">
        <span>manris v2.0</span>
        <span>iso 31000:2018</span>
      </section>
    </main>
  );
}
