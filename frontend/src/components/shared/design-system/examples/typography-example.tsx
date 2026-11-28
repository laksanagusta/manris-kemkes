import { Card, CardContent } from "@/components/ui/card";
import { formatDisplayDate } from "@/lib/display-date";

const palette = [
  { token: "workspace", label: "Kanvas", className: "bg-workspace text-foreground" },
  { token: "sidebar", label: "Navigasi", className: "bg-sidebar text-sidebar-muted-foreground" },
  { token: "sidebar-accent", label: "Navigasi aktif", className: "bg-sidebar-accent text-sidebar-accent-foreground" },
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
<<<<<<< HEAD
          <p className="text-sm leading-snug text-muted-foreground">Teks pendukung dan label kontrol memakai Geist 14 px.</p>
=======
          <p className="text-sm text-secondary-foreground">Label kontrol</p>
          <p className="text-sm leading-snug text-muted-foreground">Teks pendukung dan label kontrol memakai Geist 14 px.</p>
          <p className="text-sm text-tertiary-foreground">Diperbarui 2 hari lalu</p>
>>>>>>> 623b7d77638910f1cb7e476927b0fbc568935826
          <div>
            <p className="text-table-label text-table-header-foreground">Label kolom</p>
            <p className="mt-1 text-sm font-medium tabular-nums">1.234,56</p>
          </div>
          <div>
            <p className="text-table-label text-table-header-foreground">Tanggal dan waktu</p>
            <time className="mt-1 block text-sm tabular-nums" dateTime="2026-01-07T08:05:03+07:00">
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
