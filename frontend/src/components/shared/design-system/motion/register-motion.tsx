"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "@/components/shared/icons";

export function RegisterMotionNumber({ value }: { value: string | number }) {
  const text = String(value);
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(text);
  useEffect(() => {
    const group = ref.current;
    if (!group || previous.current === text) return;
    previous.current = text;
    group.classList.remove("is-animating");
    void group.offsetHeight;
    group.classList.add("is-animating");
  }, [text]);
  return (
    <span ref={ref} className="t-digit-group">
      <span className="sr-only">{text}</span>
      {Array.from(text).map((digit, index) => (
        <span key={index} aria-hidden="true" className="t-digit" data-stagger={index === text.length - 2 ? "1" : index === text.length - 1 ? "2" : undefined}>{digit}</span>
      ))}
    </span>
  );
}

export function RegisterSortIcon({ descending }: { descending: boolean }) {
  return (
    <span className="t-icon-swap" data-state={descending ? "a" : "b"} aria-hidden="true">
      <span className="t-icon" data-icon="a"><ChevronDown className="size-4" /></span>
      <span className="t-icon" data-icon="b"><ChevronUp className="size-4" /></span>
    </span>
  );
}
