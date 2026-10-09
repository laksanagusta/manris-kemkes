"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./marketing.module.css";

export function MarketingReveal({
  as: Tag = "div",
  className = "",
  children,
}: {
  as?: "div" | "article";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Keep server-rendered, already-visible, and anchor-target content readable.
    if (!element || reducedMotion.matches || !("IntersectionObserver" in window)
      || element.getBoundingClientRect().top < window.innerHeight) return;

    const reveal = () => {
      element.style.willChange = reducedMotion.matches ? "auto" : "transform, opacity, filter";
      element.dataset.open = "true";
      observer.disconnect();
      element.removeEventListener("focusin", onFocus);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
    const onFocus = () => {
      element.style.transition = "none";
      reveal();
      element.style.willChange = "auto";
    };
    const onMotionChange = () => { if (reducedMotion.matches) reveal(); };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) reveal();
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
    element.dataset.open = "false";
    observer.observe(element);
    element.addEventListener("focusin", onFocus);
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", onFocus);
      reducedMotion.removeEventListener("change", onMotionChange);
      element.dataset.open = "true";
    };
  }, []);

  return (
    <Tag ref={ref} className={`t-panel-slide ${styles.reveal} ${className}`} data-open="true"
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "opacity") {
          event.currentTarget.style.willChange = "auto";
        }
      }}>
      {children}
    </Tag>
  );
}
