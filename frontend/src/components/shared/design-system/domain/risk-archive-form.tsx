"use client";

import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Accordion } from "radix-ui";
import { FormPanel } from "../layout/form-container";
import styles from "./risk-archive-form.module.css";

type ArchiveIndexItem<Id extends string = string> = {
  id: Id;
  title: string;
  description: string;
  complete?: boolean;
};

const ArchiveContext = createContext<{
  sections: readonly ArchiveIndexItem[];
  active: string;
} | null>(null);

export function RiskArchiveStack<Id extends string>({ sections, active, onSelect, children }: {
  sections: readonly ArchiveIndexItem<Id>[];
  active: Id | "";
  onSelect: (id: Id | "") => void;
  children: ReactNode;
}) {
  const index = sections.findIndex(section => section.id === active);
  const current = index < 0 ? "" : sections[index].id;
  const [motion, setMotion] = useState({ index, direction: "down" });
  const direction = motion.index === index ? motion.direction : index < motion.index ? "down" : "up";

  if (motion.index !== index) {
    setMotion({ index, direction });
  }

  return (
    <ArchiveContext.Provider value={{ sections, active: current }}>
      <Accordion.Root
        type="single"
        collapsible
        value={current}
        onValueChange={value => {
          if (!value) {
            onSelect("");
            return;
          }
          const next = sections.find(section => section.id === value);
          if (next) onSelect(next.id);
        }}
        role="group"
        aria-label="Indeks bagian risiko"
        className={styles.archive}
        data-direction={direction}
      >
        {children}
      </Accordion.Root>
    </ArchiveContext.Provider>
  );
}

export function RiskArchiveSection({ id, children }: {
  id: string;
  children: ReactNode;
}) {
  const archive = useContext(ArchiveContext);
  const section = archive?.sections.find(section => section.id === id);
  const titleId = useId();
  const descriptionId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const panel = panelRef.current;
    if (!sheet || !panel) return;

    const updateHeight = () => {
      sheet.style.setProperty("--archive-panel-height", `${panel.offsetHeight}px`);
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(panel, { box: "border-box" });
    return () => observer.disconnect();
  }, [section?.id]);

  if (!section) return null;

  return (
    <Accordion.Item value={id} className={styles.item}>
      <Accordion.Header>
        <Accordion.Trigger className={styles.tabLink} aria-labelledby={titleId} aria-describedby={descriptionId}>
          <span className={styles.paper} aria-hidden="true" />
          <span className={styles.tabFace}>
            <span className={styles.tabEdge} aria-hidden="true">
              <svg viewBox="0 0 240 40" preserveAspectRatio="none" focusable="false" className={styles.tabShape}>
                <path d="M0 40C17 40 24 35 29 24L34 13C38 4 46 0 56 0H184C194 0 202 4 206 13L211 24C216 35 223 40 240 40" vectorEffect="non-scaling-stroke" />
              </svg>
            </span>
            <span className={styles.tabText}>
              <span className={styles.tabTitleLine}>
                <span
                  className={styles.completionDot}
                  data-complete={section.complete ? "true" : "false"}
                  aria-hidden="true"
                />
                <span id={titleId} className={styles.tabTitle}>
                  {section.title}
                  <span className="sr-only">{section.complete ? " lengkap" : " belum lengkap"}</span>
                </span>
              </span>
            </span>
            <span id={descriptionId} className="sr-only">{section.description}</span>
          </span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content forceMount inert={archive?.active !== id}>
        <div ref={sheetRef} className={styles.sheet}>
          <FormPanel ref={panelRef} id={id} className={`${styles.panel} scroll-mt-20 shadow-none`}>
            {children}
          </FormPanel>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
