"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { readMotionDuration } from "@/lib/motion-timing";
import { Check } from "@/components/shared/icons";

export { RegisterMotionNumber as MotionNumber } from "./register-motion";

export function MotionText({ value }: { value: string }) {
  const [displayed, setDisplayed] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || value === displayed) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = readMotionDuration(el, "--text-swap-dur", 200);
    if (!reduced) el.classList.add("is-exit");
    const timer = window.setTimeout(() => setDisplayed(value), reduced ? 0 : duration);
    return () => {
      window.clearTimeout(timer);
      el.classList.remove("is-exit");
    };
  }, [value, displayed]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-exit");
    el.classList.add("is-enter-start");
    void el.offsetHeight;
    el.classList.remove("is-enter-start");
  }, [displayed]);
  return <span><span className="sr-only">{value}</span><span ref={ref} className="t-text-swap" aria-hidden="true">{displayed}</span></span>;
}

export function MotionSuccessCheck() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;
    wrapper.querySelectorAll("path").forEach((path) => {
      const length = Math.ceil(path.getTotalLength()) + 1;
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
    });
    wrapper.dataset.state = "out";
    void wrapper.offsetWidth;
    wrapper.dataset.state = "in";
  }, []);
  return <span ref={ref} className="t-success-check app-motion-check" data-state="out" aria-hidden="true"><Check className="size-4" /></span>;
}
