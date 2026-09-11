"use client";

import { curveNatural } from "@visx/curve";
import { useMemo } from "react";
import type { Margin } from "./chart-context";
import type { LoadingStyle } from "./chart-phase";
import {
  DEFAULT_SKELETON_DATA_KEY,
  DEFAULT_SKELETON_POINT_COUNT,
  generateChartSkeletonData,
} from "./generate-chart-skeleton-data";
import { Line } from "./line";
import { LineChart } from "./line-chart";

const LOADING_DATA_KEY = DEFAULT_SKELETON_DATA_KEY;
const DEFAULT_LOADING_STROKE = "var(--foreground)";
const DEFAULT_LOADING_STROKE_OPACITY = 0.5;

export interface LineChartLoadingProps {
  /** Chart margins */
  margin?: Partial<Margin>;
  /** Stroke color for the animated loading segment. */
  stroke?: string;
  /** Stroke opacity for the animated loading segment. Default: 0.5 */
  strokeOpacity?: number;
  /** Loading animation: `"pulse"` (default traveling pulse) or `"sweep"` (a
   * diagonal shimmer across the skeleton line). Default: `"pulse"`. */
  loadingStyle?: LoadingStyle;
  /** Centered shimmer label text. Default: "Loading" */
  label?: string;
  /** Aspect ratio as "width / height". Default: "2 / 1" */
  aspectRatio?: string;
  /** Additional class name for the container */
  className?: string;
}

export function LineChartLoading({
  margin,
  stroke = DEFAULT_LOADING_STROKE,
  strokeOpacity = DEFAULT_LOADING_STROKE_OPACITY,
  loadingStyle = "pulse",
  label = "Loading",
  aspectRatio = "2 / 1",
  className = "",
}: LineChartLoadingProps) {
  const data = useMemo(
    () =>
      generateChartSkeletonData({
        dataKey: DEFAULT_SKELETON_DATA_KEY,
        pointCount: DEFAULT_SKELETON_POINT_COUNT,
      }),
    []
  );

  return (
    <LineChart
      animationDuration={0}
      aspectRatio={aspectRatio}
      className={className}
      data={data}
      loadingLabel={label}
      margin={margin}
      status="loading"
    >
      <Line
        curve={curveNatural}
        dataKey={LOADING_DATA_KEY}
        fadeEdges={false}
        loadingStroke={stroke}
        loadingStrokeOpacity={strokeOpacity}
        loadingStyle={loadingStyle}
        showHighlight={false}
        stroke="transparent"
        strokeWidth={2.5}
      />
    </LineChart>
  );
}

export default LineChartLoading;
