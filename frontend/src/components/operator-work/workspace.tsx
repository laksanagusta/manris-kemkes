"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getOperatorWorkSummary } from "@/lib/api/operator-work";
import { getMitigationTask, updateTaskReport } from "@/lib/api/mitigation-tasks";
import type { MitigationReportFormValues } from "@/lib/validation/reporting";
import {
  readWorkUIState,
  workItemHref,
  workUIKey,
  type WorkUIState,
} from "@/lib/operator-work";
import type {
  OperatorWorkSectionKey,
  OperatorWorkItem,
  OperatorWorkSummary,
} from "@/types/operator-work";
import {
  OperatorWorkLayout,
  OperatorWorkReportDialog,
  ActionButton,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionPageHeader,
} from "@/components/shared/design-system";
import { OperatorWorkSections } from "@/components/shared/design-system/domain/operator-work-sections";

export function OperatorWorkWorkspace() {
  const { token, user } = useAuth();
  if (!user || !token)
    return (
      <OperatorWorkLayout>
        <CollectionLoadingState message="Memuat pekerjaan…" />
      </OperatorWorkLayout>
    );
  if (user.role !== "unit")
    return (
      <OperatorWorkLayout>
        <CollectionErrorState
          title="Halaman operator"
          message="To-Do tersedia untuk operator unit."
        />
      </OperatorWorkLayout>
    );
  return (
    <WorkContent
      key={`${user.id}:${user.organizationId}:${token}`}
      token={token}
      userID={user.id}
    />
  );
}

function WorkContent({ token, userID }: { token: string; userID: string }) {
  const [data, setData] = useState<OperatorWorkSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [activeReport, setActiveReport] = useState<{ item: OperatorWorkItem; trigger: HTMLButtonElement } | null>(null);
  const [completingKey, setCompletingKey] = useState<string | null>(null);
  const workRegionRef = useRef<HTMLDivElement>(null);
  const reportInProgress = Boolean(activeReport || completingKey);
  const loadTask = useCallback((id: string) => getMitigationTask(token, id), [token]);
  const saveReport = useCallback((id: string, values: MitigationReportFormValues) =>
    updateTaskReport(token, id, { ...values, status: "done" }), [token]);
  const [ui, setUI] = useState<WorkUIState>(() => {
    try {
      return readWorkUIState(
        typeof window === "undefined"
          ? null
          : sessionStorage.getItem(workUIKey(userID)),
      );
    } catch {
      return readWorkUIState(null);
    }
  });
  const uiRef = useRef(ui);
  const restored = useRef(false);
  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(
        workUIKey(userID),
        JSON.stringify({
          ...uiRef.current,
          scrollY: document.querySelector("[data-app-shell-body]")?.scrollTop ?? 0,
        }),
      );
    } catch {
      /* Storage can be unavailable. */
    }
  }, [userID]);
  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    setReload((value) => value + 1);
  }, []);
  useEffect(() => {
    if (reportInProgress) return;
    let cancelled = false;
    const request = getOperatorWorkSummary(token);
    request
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Daftar pekerjaan belum berhasil dimuat.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reload, reportInProgress]);
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);
  useEffect(() => {
    if (!data || restored.current) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector("[data-app-shell-body]")?.scrollTo({
        top: uiRef.current.scrollY,
        behavior: "instant",
      });
      restored.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [data]);
  useEffect(() => {
    const scrollBody = document.querySelector("[data-app-shell-body]");
    const save = () => {
      if (restored.current) persist();
    };
    scrollBody?.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      scrollBody?.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
    };
  }, [persist]);
  function changeSection(key: OperatorWorkSectionKey, value: boolean) {
    const next = {
      ...uiRef.current,
      open: { ...uiRef.current.open, [key]: value },
    };
    uiRef.current = next;
    setUI(next);
    persist();
  }

  const finishCompletion = useCallback(() => {
    if (!completingKey) return;
    setData((current) => current && ({
      ...current,
      sections: current.sections.map((section) =>
        section.items.some((item) => item.key === completingKey)
          ? {
              ...section,
              total: Math.max(0, section.total - 1),
              items: section.items.filter((item) => item.key !== completingKey),
            }
          : section,
      ),
    }));
    setCompletingKey(null);
    refresh();
  }, [completingKey, refresh]);

  return (
    <OperatorWorkLayout
      header={
        <CollectionPageHeader
          title="To-Do"
          showTitle
          titleClassName="md:sr-only"
          className="[&>div]:flex-row [&>div]:flex-wrap [&>div]:items-center [&>div>div:last-child]:ml-auto"
          actions={
            <ActionButton asChild>
              <Link href="/risk-events?create=1" onClick={persist}>
                Catat kejadian
              </Link>
            </ActionButton>
          }
        />
      }
    >
      {error ? (
        <CollectionErrorState message={error} onReload={refresh} />
      ) : null}
      {!data && loading ? (
        <CollectionLoadingState message="Memuat pekerjaan…" />
      ) : null}
      {data ? (
        <div ref={workRegionRef} tabIndex={-1} role="region" aria-label="Pekerjaan saya" aria-busy={loading && !reportInProgress}>
          <OperatorWorkSections
            sections={data.sections}
            open={ui.open}
            onOpenChange={changeSection}
            today={data.today}
            itemHref={workItemHref}
            onNavigate={persist}
            onOpenReport={(item, trigger) => setActiveReport({ item, trigger })}
            completingKey={completingKey}
            onCompletionEnd={finishCompletion}
          />
        </div>
      ) : null}
      {activeReport && (
        <OperatorWorkReportDialog
          taskId={activeReport.item.targetId}
          loadTask={loadTask}
          saveReport={saveReport}
          onClosed={(saved) => {
            if (saved) {
              workRegionRef.current?.focus({ preventScroll: true });
              setCompletingKey(activeReport.item.key);
            } else if (activeReport.trigger.isConnected) {
              activeReport.trigger.focus({ preventScroll: true });
            }
            setActiveReport(null);
          }}
        />
      )}
    </OperatorWorkLayout>
  );
}
