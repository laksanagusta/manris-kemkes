"use client";

import { readMotionDuration } from "@/lib/motion-timing";
import { useEffect } from "react";

/** Application adapter for native and React-managed validation; owns no error state. */
export function MotionFeedback() {
  useEffect(() => {
    const selector = 'input:not([type="hidden"]), textarea, [role="combobox"], button[data-invalid]';
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Map<HTMLElement, number>();
    const owned = new Set<HTMLElement>();
    const frames = new Set<number>();
    const reset = (el: HTMLElement) => {
      const timer = timers.get(el);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.delete(el);
      el.classList.remove("is-shaking");
      if (owned.delete(el)) el.classList.remove("t-input");
    };
    const shake = (el: HTMLElement) => {
      if (!el.matches(selector) || el.closest('[data-motion-validation="manual"]') || media.matches || el.matches(":disabled")) return;
      reset(el);
      if (!el.classList.contains("t-input")) {
        el.classList.add("t-input");
        owned.add(el);
      }
      void el.offsetWidth;
      el.classList.add("is-shaking");
      const segment = (name: string, fallback: number) => readMotionDuration(el, name, fallback);
      const duration = segment("--shake-dur-a", 80) * 2 + segment("--shake-dur-b", 60) * 2;
      timers.set(el, window.setTimeout(() => reset(el), duration + 20));
    };
    const invalid = (event: Event) => {
      if (event.target instanceof HTMLElement) shake(event.target);
    };
    const input = (event: Event) => {
      if (event.target instanceof HTMLElement) reset(event.target);
    };
    const submit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const frame = requestAnimationFrame(() => {
        frames.delete(frame);
        form.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach((el) => {
          if (!timers.has(el)) shake(el);
        });
      });
      frames.add(frame);
    };
    const observer = new MutationObserver((records) => {
      for (const { target } of records) {
        if (!(target instanceof HTMLElement)) continue;
        if (target.getAttribute("aria-invalid") === "true" || target.getAttribute("data-invalid") === "true") {
          if (!timers.has(target)) shake(target);
        } else reset(target);
      }
    });
    const motionChange = () => {
      if (media.matches) [...timers.keys()].forEach(reset);
    };
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-invalid", "data-invalid"] });
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", input, true);
    document.addEventListener("submit", submit, true);
    media.addEventListener("change", motionChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", input, true);
      document.removeEventListener("submit", submit, true);
      media.removeEventListener("change", motionChange);
      frames.forEach(cancelAnimationFrame);
      [...timers.keys()].forEach(reset);
    };
  }, []);
  return null;
}
