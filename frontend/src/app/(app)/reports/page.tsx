"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FileBarChart,
  Download,
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

const trendColors: Record<string, string> = {
  Rendah: "oklch(0.72 0.17 155)",
  Sedang: "oklch(0.78 0.16 85)",
  Tinggi: "oklch(0.70 0.18 40)",
  Ekstrem: "oklch(0.62 0.22 27)",
};

const exportOptions = [
  {
    title: "Risk Register (CSV)",
    description: "Export seluruh risiko ke format CSV",
    icon: FileSpreadsheet,
    format: "CSV",
  },
  {
    title: "Risk Register (Excel)",
    description: "Export seluruh risiko ke format Excel lengkap",
    icon: FileSpreadsheet,
    format: "XLSX",
  },
  {
    title: "Incident Report (Excel)",
    description: "Export seluruh insiden ke format Excel",
    icon: FileSpreadsheet,
    format: "XLSX",
  },
  {
    title: "KRI Summary (Excel)",
    description: "Export ringkasan KRI dengan status threshold",
    icon: FileSpreadsheet,
    format: "XLSX",
  },
];

export default function ReportsPage() {
  const { token } = useAuth();
  const [trendData, setTrendData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;

    api.get<any[]>("/risks", token)
      .then(risks => {
        // Calculate Trend Data
        const trends: Record<string, any> = {};
        
        // Calculate Pie Data
        const pieCounts = { Rendah: 0, Sedang: 0, Tinggi: 0, Ekstrem: 0 };

        risks.forEach(risk => {
          if (!risk.createdAt) return;
          const d = new Date(risk.createdAt);
          const q = Math.ceil((d.getMonth() + 1) / 3);
          const period = `${d.getFullYear()}-Q${q}`;
          
          if (!trends[period]) {
            trends[period] = { Rendah: 0, Sedang: 0, Tinggi: 0, Ekstrem: 0 };
          }
          
          const score = risk.probability * risk.impact;
          let lvl = "Rendah";
          if (score >= 17) lvl = "Ekstrem";
          else if (score >= 10) lvl = "Tinggi";
          else if (score >= 5) lvl = "Sedang";
          
          trends[period][lvl] += 1;
          pieCounts[lvl as keyof typeof pieCounts] += 1;
        });
        
        const tl = Object.keys(trends).sort().map(k => ({ period: k, ...trends[k] }));
        setTrendData(tl);

        const pl = [
          { name: "Rendah", value: pieCounts.Rendah, color: trendColors.Rendah },
          { name: "Sedang", value: pieCounts.Sedang, color: trendColors.Sedang },
          { name: "Tinggi", value: pieCounts.Tinggi, color: trendColors.Tinggi },
          { name: "Ekstrem", value: pieCounts.Ekstrem, color: trendColors.Ekstrem },
        ];
        setPieData(pl);

      })
      .catch(console.error);
  }, [token]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Extract</h1>
        <p className="text-sm text-muted-foreground">
          Export data dan generate laporan risiko
        </p>
      </div>

      {/* Export Section */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Download className="size-4" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {exportOptions.map((opt) => (
              <button
                key={opt.title}
                className="flex items-start gap-3 rounded-lg border border-border/50 p-3 text-left transition-all hover:bg-muted/30 hover:border-primary/30 group"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <opt.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold group-hover:text-primary transition-colors">
                    {opt.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {opt.description}
                  </p>
                  <Badge variant="outline" className="text-[8px] h-4 px-1 mt-1.5">
                    {opt.format}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Trend */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="size-4" />
                Risk Trend Report
              </CardTitle>
              <Select defaultValue="5q">
                <SelectTrigger className="h-7 w-28 text-[10px] bg-muted/30 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5q">5 Kuartal</SelectItem>
                  <SelectItem value="8q">8 Kuartal</SelectItem>
                  <SelectItem value="all">Semua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "oklch(0.98 0.003 170 / 95%)",
                      border: "1px solid oklch(0.91 0.008 170)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      backdropFilter: "blur(8px)",
                    }}
                  />
                  {Object.entries(trendColors).map(([key, color]) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="risk"
                      fill={color}
                      radius={key === "Ekstrem" ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              {Object.entries(trendColors).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] text-muted-foreground">{key}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution Pie */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="size-4" />
              Distribusi Risiko Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: "oklch(0.98 0.003 170 / 95%)",
                      border: "1px solid oklch(0.91 0.008 170)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                </RPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-[10px] text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
