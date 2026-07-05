"use client";

import { useEffect } from "react";

function appleCornerPath({
  width,
  height,
  radius,
  smoothing = 60,
}: {
  width: number;
  height: number;
  radius: number;
  smoothing?: number;
}) {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const r = clamp(radius, 0, Math.min(w, h) / 2);
  const s = clamp(smoothing, 0, 100) / 100;

  if (!w || !h) return "";
  if (!r) return `M0 0H${w}V${h}H0Z`;

  const exponent = 2 + s * 3.35;
  const steps = 22;
  const points: Array<[number, number]> = [];

  const corner = (cx: number, cy: number, start: number, end: number) => {
    for (let index = 0; index <= steps; index += 1) {
      const angle = start + (end - start) * (index / steps);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x =
        cx + r * Math.sign(cos) * Math.abs(cos) ** (2 / exponent);
      const y =
        cy + r * Math.sign(sin) * Math.abs(sin) ** (2 / exponent);
      points.push([+x.toFixed(3), +y.toFixed(3)]);
    }
  };

  points.push([r, 0], [w - r, 0]);
  corner(w - r, r, -Math.PI / 2, 0);
  points.push([w, h - r]);
  corner(w - r, h - r, 0, Math.PI / 2);
  points.push([r, h]);
  corner(r, h - r, Math.PI / 2, Math.PI);
  points.push([0, r]);
  corner(r, r, Math.PI, Math.PI * 1.5);

  const deduped = points.filter((point, index, all) => {
    if (index === 0) return true;
    const previous = all[index - 1];
    return point[0] !== previous[0] || point[1] !== previous[1];
  });

  return `M${deduped.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
}

export function SmoothCorners() {
  useEffect(() => {
    const observed = new Map<Element, ResizeObserver>();

    const observe = (element: Element) => {
      if (!(element instanceof HTMLElement) || observed.has(element)) return;

      const resizeObserver = new ResizeObserver(() => {
        const radius = Number(element.dataset.smoothRadius || 0);
        const smoothing = Number(element.dataset.cornerSmoothing || 60);
        const { width, height } = element.getBoundingClientRect();
        const path = appleCornerPath({
          width,
          height,
          radius,
          smoothing,
        });

        element.style.clipPath = path ? `path("${path}")` : "";
      });

      resizeObserver.observe(element);
      observed.set(element, resizeObserver);
    };

    const scan = () => {
      document
        .querySelectorAll("[data-corner-smoothing]")
        .forEach(observe);
    };

    scan();
    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observed.forEach((observer) => observer.disconnect());
      observed.clear();
    };
  }, []);

  return null;
}
