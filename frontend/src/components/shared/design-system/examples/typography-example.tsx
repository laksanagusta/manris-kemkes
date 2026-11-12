import { Card, CardContent } from "@/components/ui/card";
import { formatDisplayDate } from "@/lib/display-date";

const palette = [
  { token: "workspace", label: "Kanvas", className: "bg-workspace text-foreground" },
  { token: "card", label: "Permukaan", className: "bg-card text-card-foreground" },
  { token: "secondary", label: "Sekunder", className: "bg-secondary text-secondary-foreground" },
  { token: "primary", label: "Aksi utama", className: "bg-primary text-primary-foreground" },
  { token: "workspace-data", label: "Data", className: "bg-workspace-data", decorative: true },
];

export function TypographyExample() {
  return (
    <Card>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <p className="text-page-title tracking-normal">Judul halaman</p>
          <p className="text-section-title tracking-[-0.015em]">Judul bagian</p>
          <p className="text-sm leading-snug text-muted-foreground">Teks pendukung dan label kontrol memakai Inter 14 px.</p>
          <div>
            <p className="text-table-label text-table-header-foreground">Label kolom</p>
            <p className="mt-1 text-sm font-medium tabular-nums">1.234,56</p>
          </div>
          <div>
            <p className="text-table-label text-table-header-foreground">Tanggal dan waktu</p>
            <time className="mt-1 block text-sm tabular-nums" style={{ fontFamily: "var(--font-inter), sans-serif" }} dateTime="2026-01-07T08:05:03+07:00">
              {formatDisplayDate(new Date("2026-01-07T08:05:03+07:00"), {
                year: "numeric", month: "short", day: "2-digit",
                hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta",
              })}
            </time>
          </div>
        </div>
        <ul className="grid grid-cols-2 content-start gap-3 sm:grid-cols-3">
          {palette.map(({ token, label, className, decorative }) => (
            <li key={token} className="min-w-0 space-y-1">
              <div aria-hidden={decorative || undefined} className={`flex min-h-12 items-center rounded-md border border-border px-2 text-xs ${className}`}>
                {decorative ? null : label}
              </div>
              <span className="block wrap-anywhere text-xs text-muted-foreground">{token}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
