import {
  Activity,
  AgentIcon,
  AttachmentIcon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
} from "@/components/shared/icons";

const iconExamples = [
  { label: "Agent (SVG khusus)", icon: AgentIcon },
  { label: "Lampiran (SVG khusus)", icon: AttachmentIcon },
  { label: "Navigation", icon: Activity },
  { label: "Warning", icon: AlertTriangle },
  { label: "Success", icon: CheckCircle2 },
  { label: "Information", icon: Info },
  { label: "Search", icon: Search },
] as const;

export function IconographyExample() {
  return (
    <div className="space-y-4 rounded-[12px] bg-card p-6 shadow-black">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {iconExamples.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-[12px] border border-border bg-background text-muted-foreground"
          >
            <Icon aria-hidden="true" className="size-5 text-foreground" strokeWidth={Icon === AgentIcon ? 2.2 : Icon === AttachmentIcon ? 2.4 : 1.8} />
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Ikon aplikasi menggunakan Hugeicons melalui shared icon layer, kecuali
        chevron dari Lucide serta ikon Agent dan lampiran berupa SVG khusus sesuai referensi. Ukuran mengikuti utility
        class dan warna mengikuti currentColor.
      </p>
    </div>
  );
}
