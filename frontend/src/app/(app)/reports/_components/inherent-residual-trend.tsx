"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InherentResidualDatum } from "@/lib/dashboard-insights";

const INHERENT_COLOR = "oklch(0.62 0.22 27)";
const RESIDUAL_COLOR = "oklch(0.72 0.17 155)";
const GAP_COLOR = "oklch(0.60 0.16 270)";

interface InherentResidualTrendProps {
  loading?: boolean;
  data?: InherentResidualDatum[];
}

export function InherentResidualTrend({ loading, data = [] }: InherentResidualTrendProps) {
  // TODO: redesign after GAP-4
  return null;
}
