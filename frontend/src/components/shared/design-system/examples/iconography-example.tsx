import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
} from "@/components/ui/icons";

const iconExamples = [
  { label: "Navigation", icon: Activity },
  { label: "Warning", icon: AlertTriangle },
  { label: "Success", icon: CheckCircle2 },
  { label: "Information", icon: Info },
  { label: "Search", icon: Search },
] as const;

export function IconographyExample() {
  return (
    <div className="space-y-4 rounded-2xl bg-card p-6 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {iconExamples.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background text-muted-foreground"
          >
            <Icon aria-hidden="true" className="size-5 text-foreground" strokeWidth={1.8} />
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Semua ikon aplikasi menggunakan Hugeicons melalui shared icon layer,
        dengan ukuran dari utility class dan warna mengikuti currentColor.
      </p>
    </div>
  );
}
