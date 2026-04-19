"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  FileText,
  PieChartIcon,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { fetchForm, fetchFormAnalytics } from "@/lib/api/forms";
import type { Form, FormAnalyticsSummary, FormFieldAnalytics } from "@/types/form";

// ── Constants ─────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#4f46e5", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#d97706", "#6366f1", "#ec4899", "#14b8a6"];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draf", variant: "secondary" },
  published: { label: "Terbit", variant: "default" },
  closed: { label: "Ditutup", variant: "destructive" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toBarData(summary: Record<string, number>) {
  return Object.entries(summary).map(([name, count]) => ({ name, count }));
}

function toPieData(summary: Record<string, number>) {
  return Object.entries(summary).map(([name, value]) => ({ name, value }));
}

function buildTrendRows(field: FormFieldAnalytics) {
  if (!field.trend || field.trend.length === 0) return [];
  const optionKeys = new Set<string>();
  for (const tp of field.trend) {
    for (const k of Object.keys(tp.values)) optionKeys.add(k);
  }
  return field.trend.map((tp) => {
    const row: Record<string, string | number> = { period: formatPeriod(tp.period) };
    for (const key of optionKeys) {
      row[key] = tp.values[key] ?? 0;
    }
    return row;
  });
}

function getOptionKeys(field: FormFieldAnalytics): string[] {
  const keys = new Set<string>();
  for (const tp of field.trend) {
    for (const k of Object.keys(tp.values)) keys.add(k);
  }
  return Array.from(keys);
}

function formatPeriod(raw: string): string {
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return raw;
  }
}

function isOptionBased(fieldType: string): boolean {
  return fieldType === "radio" || fieldType === "dropdown" || fieldType === "checkbox";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-56 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      Belum ada respons untuk ditampilkan.
    </div>
  );
}

function OptionBarChart({ field }: { field: FormFieldAnalytics }) {
  const data = toBarData(field.summary);
  if (data.length === 0) return <EmptyState />;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
          <Tooltip
            contentStyle={{ background: "oklch(0.98 0.003 170 / 95%)", border: "1px solid oklch(0.91 0.008 170)", borderRadius: "8px", fontSize: "12px" }}
          />
          <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function OptionPieChart({ field }: { field: FormFieldAnalytics }) {
  const data = toPieData(field.summary);
  if (data.length === 0) return <EmptyState />;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
            labelLine={false}
            fontSize={11}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "oklch(0.98 0.003 170 / 95%)", border: "1px solid oklch(0.91 0.008 170)", borderRadius: "8px", fontSize: "12px" }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TextFieldCard({ field, totalResponses }: { field: FormFieldAnalytics; totalResponses: number }) {
  const filled = field.summary["filled"] ?? 0;
  const total = totalResponses;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground" />
          <CardTitle className="text-[15px] font-semibold">{field.label}</CardTitle>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {field.fieldType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{filled}</p>
            <p className="text-xs text-muted-foreground">Terisi</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-muted-foreground">{total - filled}</p>
            <p className="text-xs text-muted-foreground">Kosong</p>
          </div>
          <div className="ml-auto text-center">
            <p className="text-2xl font-semibold">{pct}%</p>
            <p className="text-xs text-muted-foreground">Tingkat pengisian</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldTrendChart({ field }: { field: FormFieldAnalytics }) {
  const rows = buildTrendRows(field);
  const keys = getOptionKeys(field);
  if (rows.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="text-muted-foreground" />
          <CardTitle className="text-[15px] font-semibold">Tren: {field.label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 24, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "oklch(0.98 0.003 170 / 95%)", border: "1px solid oklch(0.91 0.008 170)", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {keys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FormAnalyticsPage() {
  const params = useParams();
  const formId = params.id as string;
  const { token } = useAuth();

  const [form, setForm] = useState<Form | null>(null);
  const [analytics, setAnalytics] = useState<FormAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !formId) return;

    setLoading(true);
    setError(null);

    Promise.all([fetchForm(formId, token), fetchFormAnalytics(formId, token)])
      .then(([formData, analyticsData]) => {
        setForm(formData);
        setAnalytics(analyticsData);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Gagal memuat data analitik";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token, formId]);

  if (loading) return <LoadingSkeleton />;

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

  if (!form || !analytics) return null;

  const status = STATUS_MAP[form.status] ?? { label: form.status, variant: "outline" as const };
  const optionFields = analytics.fields.filter((f) => isOptionBased(f.fieldType));
  const trendFields = optionFields.filter((f) => f.trend && f.trend.length > 0);

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
          href={`/admin/forms/${formId}/responses`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ClipboardList className="size-4" />
          Lihat Respons →
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Ringkasan dan visualisasi data respons formulir
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.totalResponses}</p>
              <p className="text-xs text-muted-foreground">Total Respons</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-12 items-center justify-center rounded-lg bg-violet-500/10">
              <PieChartIcon className="size-6 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.fields.length}</p>
              <p className="text-xs text-muted-foreground">Total Field</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="size-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{optionFields.length}</p>
              <p className="text-xs text-muted-foreground">Field dengan Chart</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state for 0 responses */}
      {analytics.totalResponses === 0 && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BarChart3 className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Belum ada respons untuk formulir ini.</p>
            <p className="text-xs text-muted-foreground">Bagikan formulir yang sudah diterbitkan untuk mulai mengumpulkan data.</p>
          </CardContent>
        </Card>
      )}

      {/* Field Analytics */}
      {analytics.totalResponses > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {analytics.fields.map((field) => {
            // Text / Textarea → stat card
            if (field.fieldType === "text" || field.fieldType === "textarea") {
              return (
                <TextFieldCard
                  key={field.fieldId}
                  field={field}
                  totalResponses={analytics.totalResponses}
                />
              );
            }

            // Radio / Dropdown → Bar + Pie
            if (field.fieldType === "radio" || field.fieldType === "dropdown") {
              return (
                <div key={field.fieldId} className="flex flex-col gap-6 lg:col-span-2">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="text-muted-foreground" />
                          <CardTitle className="text-[15px] font-semibold">{field.label}</CardTitle>
                          <Badge variant="outline" className="ml-auto text-[10px]">
                            {field.fieldType}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <OptionBarChart field={field} />
                      </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <PieChartIcon className="text-muted-foreground" />
                          <CardTitle className="text-[15px] font-semibold">{field.label} — Distribusi</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <OptionPieChart field={field} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            }

            // Checkbox → Bar only
            if (field.fieldType === "checkbox") {
              return (
                <Card key={field.fieldId} className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-muted-foreground" />
                      <CardTitle className="text-[15px] font-semibold">{field.label}</CardTitle>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        checkbox
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <OptionBarChart field={field} />
                  </CardContent>
                </Card>
              );
            }

            return null;
          })}

          {/* Trend Line Charts */}
          {trendFields.map((field) => (
            <FieldTrendChart key={`trend-${field.fieldId}`} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}
