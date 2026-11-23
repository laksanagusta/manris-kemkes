"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AccentButton } from "@/components/shared/design-system/actions/accent-button";
import { ActionButton } from "@/components/shared/design-system/actions/action-button";
import { RiskExportButton } from "@/components/shared/design-system/actions/risk-export-button";
import { CollectionPagination } from "@/components/shared/design-system/collections/collection-pagination";
import { CollectionSearchField } from "@/components/shared/design-system/collections/collection-search-field";
import { CollectionToolbar } from "@/components/shared/design-system/collections/collection-toolbar";
import { PopoverSelectField } from "@/components/shared/design-system/fields/popover-select-field";
import { ArrowLeft, LayoutGridIcon, Plus, Upload } from "@/components/shared/icons";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getRiskLevelDisplayLabel, getRiskLevelFromNilai, riskCategoryLabels } from "@/lib/risk";
import { VariantPicker } from "@/app/(app)/prototypes/_components/variant-picker";
import { formatCreated, optionalColumns, organizations, riskStatuses, sampleRisks, type OptionalColumn, type RiskRow } from "./data";
import { RiskDetails, surface } from "./parts";
import { Pratinjau } from "./pratinjau";
import { Ringkas } from "./ringkas";
import { Status } from "./status";
import { Tabel } from "./tabel";

const AppShell = dynamic(
  () => import("@/components/app-shell").then((module) => module.AppShell),
  { ssr: false },
);

const variants = [Tabel, Ringkas, Status, Pratinjau];
const names = ["Tabel", "Ringkas", "Status", "Pratinjau"];
const orderOptions = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "score", label: "Skor tertinggi" },
  { value: "title", label: "Judul A–Z" },
];
const statusOptions = [{ value: "all", label: "Semua status" }, ...Object.entries(riskStatuses).map(([value, label]) => ({ value, label }))];
const organizationOptions = [{ value: "all", label: "Semua organisasi" }, ...organizations.map((name) => ({ value: name, label: name }))];

export function RiskRegisterPrototype({ initialVariant }: { initialVariant: number }) {
  const [current, setCurrent] = useState(initialVariant >= 1 && initialVariant <= variants.length && Number.isInteger(initialVariant) ? initialVariant - 1 : 0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [organization, setOrganization] = useState("all");
  const [order, setOrder] = useState("newest");
  const [visible, setVisible] = useState(() => new Set<OptionalColumn>(optionalColumns.map(({ id }) => id)));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openRisk, setOpenRisk] = useState<RiskRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const stage = useRef<HTMLElement | null>(null);

  const select = useCallback((index: number) => {
    setCurrent(index);
    const url = new URL(location.href);
    url.searchParams.set("v", String(index + 1));
    history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (openRisk || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [role=menu], [role=listbox], [role=combobox]"))) return;
      if (/^[1-4]$/.test(event.key)) select(Number(event.key) - 1);
      else if (event.key === "ArrowRight") select((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") select((current - 1 + variants.length) % variants.length);
      else return;
      event.preventDefault();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [current, openRisk, select]);

  const search = query.toLowerCase().trim();
  const filtered = sampleRisks.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (organization !== "all" && row.organization !== organization) return false;
    return [row.code, row.title, row.organization, riskCategoryLabels[row.category]]
      .some((part) => part.toLowerCase().includes(search));
  }).sort((a, b) => {
    if (order === "title") return a.title.localeCompare(b.title, "id");
    if (order === "score") return (b.score ?? -1) - (a.score ?? -1);
    return (order === "oldest" ? 1 : -1) * a.created.localeCompare(b.created);
  });
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const Variant = variants[current];

  async function download() {
    setExporting(true);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Register Risiko");
      sheet.addRow(["Kode risiko", "Risiko", "Kategori", "Nama Organisasi", "Skor", "Tingkat Risiko", "Status", "Dibuat (WIB)"]);
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.getColumn(2).width = 62;
      sheet.getColumn(4).width = 33;
      sheet.getColumn(8).width = 26;
      for (const row of filtered) {
        const level = row.score === null ? "" : getRiskLevelDisplayLabel(getRiskLevelFromNilai(row.score));
        sheet.addRow([row.code, row.title, riskCategoryLabels[row.category], row.organization, row.score, level, riskStatuses[row.status], formatCreated(row.created)]);
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "Simulasi_Register_Risiko.xlsx";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Excel simulasi diunduh.");
    } catch {
      toast.error("Excel simulasi gagal diunduh.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <div className="min-w-0 space-y-4 pb-24">
        <header>
          <Link href="/risk/register" className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Buka Register Risiko
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Risiko</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prototipe · Data simulasi</p>
        </header>
        <CollectionToolbar
          wrapActions
          leading={
            <div className="flex flex-wrap items-center gap-2">
              <CollectionSearchField aria-label="Cari risiko" placeholder="Cari risiko..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} containerClassName="sm:w-[235px]" />
              <PopoverSelectField ariaLabel="Filter status" value={status} onValueChange={(value) => { setStatus(value); setPage(1); }} options={statusOptions} placeholder="Status" fitContent />
              <PopoverSelectField ariaLabel="Filter organisasi" value={organization} onValueChange={(value) => { setOrganization(value); setPage(1); }} options={organizationOptions} placeholder="Organisasi" fitContent />
              <PopoverSelectField ariaLabel="Urutkan risiko" value={order} onValueChange={(value) => { setOrder(value); setPage(1); }} options={orderOptions} placeholder="Urutan" fitContent />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ActionButton icon={<LayoutGridIcon aria-hidden="true" />}>Kolom</ActionButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {optionalColumns.map(({ id, label }) => (
                    <DropdownMenuCheckboxItem
                      key={id}
                      checked={current === 2 && id === "status" ? true : visible.has(id)}
                      disabled={current === 2 && id === "status"}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) => setVisible((previous) => {
                        const next = new Set(previous);
                        if (checked) next.add(id);
                        else next.delete(id);
                        return next;
                      })}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
          actions={
            <>
              <RiskExportButton loading={exporting} disabled={filtered.length === 0} onClick={() => void download()} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ActionButton icon={<Upload aria-hidden="true" />}>Import Risiko</ActionButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link href="/risk/register/bulk">Import file/template</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/risk/register/import-sop">Ekstrak risiko dari dokumen</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AccentButton asChild icon={<Plus aria-hidden="true" />}><Link href="/risk/register/new">Risiko Baru</Link></AccentButton>
            </>
          }
        />
        <section ref={stage} tabIndex={-1} aria-label={`Register Risiko · ${names[current]}`} className="min-w-0 rounded-(--surface-radius) focus-visible:outline-2 focus-visible:outline-ring">
          {rows.length ? (
            <Variant key={current} rows={rows} visible={visible} onOpen={(row) => {
              const focused = document.activeElement;
              opener.current = focused instanceof HTMLElement ? focused : null;
              if (focused?.closest("[role=menu]")) {
                opener.current = document.getElementById(`prototype-risk-action-${row.code}`);
              }
              setOpenRisk(row);
            }} />
          ) : (
            <div className={`${surface} space-y-1 px-4 py-12 text-center`} role="status">
              <p className="text-sm font-medium">Tidak ada risiko yang cocok</p>
              <p className="text-sm text-muted-foreground">Ubah kata kunci atau filter untuk menampilkan hasil.</p>
            </div>
          )}
        </section>
        <CollectionPagination standalone itemLabel="risiko" page={page} pageSize={pageSize} pageSizeOptions={[10, 20]} total={filtered.length} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
        <Dialog open={openRisk !== null} onOpenChange={(open) => { if (!open) setOpenRisk(null); }}>
          {openRisk && (
            <DialogContent onCloseAutoFocus={(event) => {
              event.preventDefault();
              (opener.current?.isConnected ? opener.current : stage.current)?.focus();
            }}>
              <DialogHeader>
                <DialogTitle>{openRisk.title}</DialogTitle>
                <DialogDescription>{openRisk.code} · Ringkasan risiko simulasi</DialogDescription>
              </DialogHeader>
              <RiskDetails row={openRisk} />
            </DialogContent>
          )}
        </Dialog>
        <VariantPicker names={names} current={current} select={select} />
      </div>
    </AppShell>
  );
}
