import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/shared/icons";

type RiskGuidePageProps = {
  content?: RiskGuideContent;
  className?: string;
};

const STATUS_CONFIG = {
  draft: {
    label: "draft",
    icon: Circle,
  },
  final: {
    label: "final",
    icon: CheckCircle2,
  },
};

function StatusPill({ status }: { status: string }) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <Badge variant={status === "final" ? "default" : "secondary"} className={status === "final" ? "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : ""}>
      <Icon />
      {config.label}
    </Badge>
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
      {!isFirst ? <Separator className="w-8" /> : null}
      <div className="flex flex-col items-center gap-1">
      <Badge variant={status === "final" ? "default" : "secondary"} className={status === "final" ? "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : ""}><Icon />{label}</Badge>
      </div>
      {!isLast && (
        <div className="flex items-center justify-center w-6">
          <ArrowRight className="size-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function PhaseBlock({
  phase,
  steps,
}: {
  phase: string;
  steps: { label: string; status: string }[];
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{phase}</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-center gap-1">
        {steps.map((step, i) => (
          <FlowNode
            key={step.label}
            label={step.label}
            status={step.status}
            isFirst={i === 0}
            isLast={i === steps.length - 1}
          />
        ))}
      </CardContent>
    </Card>
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
  return (
    <div className="group relative pb-8">
      {index < 5 && (
        <div className="absolute left-[11px] top-6 h-full w-px bg-border/40" />
      )}

      <div className="absolute left-0 top-0 flex size-6 items-center justify-center rounded-full border border-border/70 bg-background font-mono text-[10px] font-bold text-muted-foreground shadow-sm">
        {stepNum}
      </div>

      <Card className="ml-10 transition-colors hover:bg-sidebar-accent/50">
        <CardHeader>
          <CardTitle><h3>{step.title}</h3></CardTitle>
          <StatusPill status={step.status} />
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {step.actions.map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              <span>{action}</span>
            </div>
          ))}
        </CardContent>
      </Card>
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
        "mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8",
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
            className="text-2xl font-semibold tracking-tight"
          >
            {content.hero.title}
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-secondary-foreground">
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

        <Card className="overflow-hidden">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <PlayCircle className="size-4 text-primary" />
              <CardTitle className="">
                {content.video.title}
              </CardTitle>
            </div>
            <CardDescription className="">
              {content.video.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border/50 bg-primary shadow-sm">
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
              <Button asChild variant="link">
                <a href={content.video.url} target="_blank" rel="noreferrer">
                  {content.video.label}<ExternalLink data-icon="inline-end" />
                </a>
              </Button>
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

        <p className="max-w-3xl text-sm leading-relaxed text-secondary-foreground">
          {content.documents.description}
        </p>

        <div className="grid gap-4">
          {content.documents.items.map((document) => (
            <Card
              key={document.title}
              className="overflow-hidden"
            >
              <CardHeader className="space-y-2">
                <CardTitle className="">
                  {document.title}
                </CardTitle>
                <CardDescription className="">
                  {document.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
                  Buka dokumen di tab baru untuk membaca versi lengkapnya
                  langsung dari Google Drive.
                </p>
                <Button asChild variant="outline">
                  <a href={document.url} target="_blank" rel="noreferrer">
                    {document.label}<ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
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

        <div className="flex flex-col gap-3">
          <PhaseBlock
            phase={content.flow.phase1}
            steps={[
              { label: "daftar", status: "draft" },
              { label: "finalisasi", status: "final" },
              { label: "aktif", status: "final" },
            ]}
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

        <div className="grid gap-3">
          {content.faq.items.map((item) => (
            <Card key={item.question}>
              <CardHeader><CardTitle>{item.question}</CardTitle><CardDescription>{item.answer}</CardDescription></CardHeader>
            </Card>
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
