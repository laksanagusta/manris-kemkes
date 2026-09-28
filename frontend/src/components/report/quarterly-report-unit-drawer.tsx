"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/shared/app-drawer";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatReportNumber,
  taskStateLabels,
  severityLabels,
  conditionLabels,
  eventHasRiskLinks,
  type QuarterlyAnalysis,
} from "@/lib/quarterly-report";

type Unit = QuarterlyAnalysis["units"][number];
export function QuarterlyReportUnitDrawer({
  unit,
  open,
  cycle,
  onClose,
  onRestoreFocus,
}: {
  unit: Unit | null;
  open: boolean;
  cycle: string;
  onClose: () => void;
  onRestoreFocus: () => void;
}) {
  const [selection, setSelection] = useState<{
    unitId?: string;
    view: "risks" | "tasks" | "events";
    query: string;
  }>({ view: "risks", query: "" });
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, unit?.id]);
  const view = selection.unitId === unit?.id ? selection.view : "risks";
  const query = selection.unitId === unit?.id ? selection.query : "";
  const match = (value: string) =>
    value
      .toLocaleLowerCase("id")
      .includes(query.trim().toLocaleLowerCase("id"));
  const risks =
    unit?.rows.filter(({ risk }) =>
      match(`${risk.title} ${risk.code || risk.riskCode || ""}`),
    ) ?? [];
  const tasks =
    unit?.tasks.filter(({ task }) =>
      match(
        `${task.mitigationAction} ${task.riskTitle} ${task.mitigationOwner}`,
      ),
    ) ?? [];
  const events =
    unit?.events.filter((event) =>
      match(`${event.description} ${event.code}`),
    ) ?? [];
  return (
    <Drawer
      open={open && unit !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      direction="right"
      autoFocus
    >
      <DrawerContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <DrawerHeader>
          <DrawerTitle>{unit?.name ?? "Detail unit"}</DrawerTitle>
          <DrawerDescription>
            {cycle} · Detail dalam scope laporan aktif.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-5">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Data unit"
          >
            {(
              [
                ["risks", "Risiko"],
                ["tasks", "Mitigasi"],
                ["events", "Kejadian"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={view === value ? "secondary" : "ghost"}
                aria-pressed={view === value}
                onClick={() => {
                  setSelection({ unitId: unit?.id, view: value, query: "" });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <InputGroup>
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              value={query}
              onChange={(event) =>
                setSelection({
                  unitId: unit?.id,
                  view,
                  query: event.target.value,
                })
              }
              placeholder="Cari dalam unit..."
              aria-label="Cari data unit"
            />
          </InputGroup>
          {view === "risks" && (
            <div className="space-y-5">
              {risks.map((row) => (
                <div key={row.risk.id} className="space-y-2">
                  <Link
                    href={`/risk/register/${row.risk.id}`}
                    className="break-words text-sm hover:underline"
                  >
                    {row.risk.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {row.risk.code || row.risk.riskCode || "—"}
                  </p>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <dt className="text-muted-foreground">
                      Profil / hasil final
                    </dt>
                    <dd className="text-right tabular-nums">
                      {formatReportNumber(row.profile)} /{" "}
                      {formatReportNumber(row.observed)}
                    </dd>
                    <dt className="text-muted-foreground">Target</dt>
                    <dd className="text-right tabular-nums">
                      {formatReportNumber(row.target)}
                    </dd>
                  </dl>
                  {row.risk.archivedInPeriod && (
                    <p className="text-xs text-muted-foreground">
                      Diarsipkan dalam periode ini
                    </p>
                  )}
                  {row.attention.map((item) => (
                    <p key={item} className="text-xs text-muted-foreground">
                      {item}
                    </p>
                  ))}
                </div>
              ))}
              {!risks.length && (
                <p className="text-sm text-muted-foreground">
                  {query
                    ? "Tidak ada hasil pencarian."
                    : "Belum ada risiko pada periode ini."}
                </p>
              )}
            </div>
          )}
          {view === "tasks" && (
            <div className="space-y-5">
              {tasks.map(({ task, state }) => (
                <div key={task.id} className="space-y-2">
                  <p className="break-words">
                    {task.mitigationAction || "Tugas mitigasi"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.mitigationOwner || "PIC belum dicatat"} ·{" "}
                    {taskStateLabels[state]}
                  </p>
                  <Link
                    href={`/risk/register/${task.riskId}`}
                    className="text-xs hover:underline"
                  >
                    {task.riskTitle || task.riskCode || "Lihat risiko"}
                  </Link>
                  {task.notes && (
                    <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {task.notes}
                    </p>
                  )}
                </div>
              ))}
              {!tasks.length && (
                <p className="text-sm text-muted-foreground">
                  {query
                    ? "Tidak ada hasil pencarian."
                    : "Belum ada tugas mitigasi pada periode ini."}
                </p>
              )}
            </div>
          )}
          {view === "events" && (
            <div className="space-y-5">
              {events.map((event) => (
                <div key={event.id} className="space-y-2">
                  <Link
                    href={`/risk-events/${event.id}`}
                    className="break-words hover:underline"
                  >
                    {event.description}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {severityLabels[event.severity]} ·{" "}
                    {conditionLabels[event.postResponseCondition]}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {event.actualImpact}
                  </p>
                  {event.linkedRisks?.length ? (
                    <ul className="space-y-1">
                      {event.linkedRisks.map((risk) => (
                        <li key={risk.id}>
                          <Link
                            href={`/risk/register/${risk.id}`}
                            className="break-words text-xs hover:underline"
                          >
                            {risk.code}: {risk.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {eventHasRiskLinks(event)
                        ? "Risiko terkait berada di luar scope laporan."
                        : "Belum terhubung ke register"}
                    </p>
                  )}
                </div>
              ))}
              {!events.length && (
                <p className="text-sm text-muted-foreground">
                  {query
                    ? "Tidak ada hasil pencarian."
                    : "Belum ada kejadian pada periode ini."}
                </p>
              )}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
