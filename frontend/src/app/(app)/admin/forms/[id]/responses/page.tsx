"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Eye,
  Inbox,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { fetchForm, fetchFormResponses } from "@/lib/api/forms";
import type { Form, FormField, FormResponse } from "@/types/form";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortId(uuid: string): string {
  return uuid.slice(-8);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Flatten all fields from every section, preserving section/position order. */
function flattenFields(form: Form): FormField[] {
  return (form.sections ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((s) =>
      (s.fields ?? []).slice().sort((a, b) => a.position - b.position),
    );
}

/** Render an answer value as a human-readable string. */
function renderAnswer(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Draf", variant: "secondary" },
  published: { label: "Terbit", variant: "default" },
  closed: { label: "Ditutup", variant: "destructive" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FormResponsesPage() {
  const params = useParams();
  const formId = params.id as string;
  const { token } = useAuth();

  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // detail dialog
  const [selected, setSelected] = useState<FormResponse | null>(null);

  useEffect(() => {
    if (!token || !formId) return;

    setLoading(true);
    setError(null);

    Promise.all([fetchForm(formId, token), fetchFormResponses(formId, token)])
      .then(([formData, responsesData]) => {
        setForm(formData);
        setResponses(responsesData);
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Gagal memuat data respons";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token, formId]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <Link
          href="/admin/forms"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Daftar Form
        </Link>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) return null;

  const fields = flattenFields(form);
  const status = STATUS_MAP[form.status] ?? {
    label: form.status,
    variant: "outline" as const,
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/forms"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Daftar Form
        </Link>
        <Link
          href={`/admin/forms/${formId}/analytics`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <BarChart3 className="size-4" />
          Lihat Analytics →
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {responses.length} respons diterima
        </p>
      </div>

      {/* Empty state */}
      {responses.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Inbox className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Belum ada respons untuk formulir ini.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Bagikan formulir yang sudah diterbitkan untuk mulai mengumpulkan
              data.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Responses table */
        <div className="rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs w-12">#</TableHead>
                <TableHead className="text-xs w-40">Responden</TableHead>
                <TableHead className="text-xs w-44">Waktu Submit</TableHead>
                {fields.slice(0, 3).map((f) => (
                  <TableHead key={f.id} className="text-xs max-w-[180px]">
                    {f.label}
                  </TableHead>
                ))}
                <TableHead className="text-xs w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((resp, idx) => (
                <TableRow
                  key={resp.id}
                  className="border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="text-xs text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <User className="size-3 text-muted-foreground" />
                      <span className="font-mono text-muted-foreground">
                        User …{shortId(resp.respondentId)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(resp.submittedAt)}
                  </TableCell>
                  {fields.slice(0, 3).map((f) => (
                    <TableCell
                      key={f.id}
                      className="text-xs max-w-[180px] truncate"
                    >
                      {renderAnswer(resp.answers[f.fieldKey])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setSelected(resp)}
                    >
                      <Eye className="size-3.5" />
                      <span className="sr-only">Lihat detail</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t border-border/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {responses.length} respons
            </p>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4" />
                Detail Respons
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  User …{shortId(selected.respondentId)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dikirim: {formatDate(selected.submittedAt)}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {fields.map((field) => {
                const answer = selected.answers[field.fieldKey];
                return (
                  <div key={field.id} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </p>
                    <p className="text-sm">{renderAnswer(answer)}</p>
                  </div>
                );
              })}

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Tidak ada field yang terdefinisi untuk formulir ini.
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
