"use client";

import { ArrowDown, ArrowUp, Minus, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MovementSnapshotDatum } from "@/lib/dashboard-insights";

interface RiskMovementSnapshotProps {
  data: MovementSnapshotDatum[];
  loading?: boolean;
}

const movementConfig: Record<MovementSnapshotDatum["key"], {
  icon: typeof Plus;
  label: string;
  colorClass: string;
  bgClass: string;
}> = {
  new: { icon: Plus, label: "Baru", colorClass: "text-chart-1", bgClass: "bg-chart-1" },
  up: { icon: ArrowUp, label: "Naik", colorClass: "text-risk-high", bgClass: "bg-risk-high" },
  down: { icon: ArrowDown, label: "Turun", colorClass: "text-success", bgClass: "bg-success" },
  stable: { icon: Minus, label: "Stabil", colorClass: "text-muted-foreground", bgClass: "bg-muted-foreground" },
  removed: { icon: Trash2, label: "Keluar", colorClass: "text-risk-extreme", bgClass: "bg-risk-extreme" },
};

export function RiskMovementSnapshot({ data, loading }: RiskMovementSnapshotProps) {
  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="movement-snapshot">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Gerakan Risiko</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="movement-snapshot">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Gerakan Risiko</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">Perubahan portofolio risiko vs cycle sebelumnya.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {data.map((item) => {
            const config = movementConfig[item.key];
            const Icon = config.icon;
            return (
              <div
                key={item.key}
                data-testid={`movement-${item.key}`}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border/40 bg-muted/20 p-2"
              >
                <div className={cn("flex size-7 items-center justify-center rounded-md", config.bgClass)}>
                  <Icon className="size-4 text-white" />
                </div>
                <span className={cn("text-xl font-bold", config.colorClass)}>{item.value}</span>
                <span className="text-[10px] text-muted-foreground">{config.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
