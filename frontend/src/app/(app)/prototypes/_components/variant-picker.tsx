import { useEffect, useLayoutEffect, useRef } from "react";
import "./picker.css";

export function VariantPicker({ names, current, select }: { names: readonly string[]; current: number; select: (index: number) => void }) {
  const picker = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const move = () => {
      const active = items.current[current];
      if (!active || !highlight.current) return;
      highlight.current.style.width = `${active.offsetWidth}px`;
      highlight.current.style.transform = `translateX(${active.offsetLeft}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [current]);

  useEffect(() => {
    let afterPaint = 0;
    const frame = requestAnimationFrame(() => {
      afterPaint = requestAnimationFrame(() => picker.current?.setAttribute("data-ready", ""));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(afterPaint);
    };
  }, []);

  return (
    <nav ref={picker} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
      {names.map((name, index) => (
        <button key={name} ref={(node) => { items.current[index] = node; }} className="proto-picker-item" data-active={index === current ? "" : undefined} aria-current={index === current ? "true" : undefined} onClick={() => select(index)}>{name}</button>
      ))}
    </nav>
  );
}
