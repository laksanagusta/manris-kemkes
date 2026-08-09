"use client";

import { designSystemRadiusTokens } from "../data/radius-tokens";

export function RadiusScaleExample() {
  return (
    <div className="flex flex-wrap gap-3">
      {designSystemRadiusTokens.map((token) => (
        <div
          key={token.name}
          className="flex size-20 items-center justify-center border border-border/60 bg-card text-center text-[10px] leading-tight text-muted-foreground shadow-none"
          style={{ borderRadius: token.value }}
        >
          {token.name}
        </div>
      ))}
    </div>
  );
}
