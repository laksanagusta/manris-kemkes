"use client";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CollectionTableCard } from "../collections/collection-table-card";
import { CollectionTableHead } from "../collections/collection-table-head";
import { CollectionTableHeader } from "../collections/collection-table-header";
import { CollectionTableHeaderRow } from "../collections/collection-table-header-row";
import { CollectionPagination } from "../collections/collection-pagination";
import { ActionButton } from "../actions/action-button";
import { deadlineLabel } from "@/lib/operator-work";
import type { OperatorWorkItem, OperatorWorkPage } from "@/types/operator-work";

export function OperatorWorkTable({data,today,busyKey,onOpen,pageSize,onPageChange,onPageSizeChange,loading}: {
 data: OperatorWorkPage; today:string; busyKey?:string|null; onOpen:(item:OperatorWorkItem)=>void;
 pageSize:number; onPageChange:(page:number)=>void; onPageSizeChange:(size:number)=>void; loading:boolean;
}) {
 return <CollectionTableCard>
  <Table aria-label="Pekerjaan sesuai filter To-Do" aria-busy={loading}>
   <CollectionTableHeader><CollectionTableHeaderRow><CollectionTableHead>Pekerjaan</CollectionTableHead><CollectionTableHead>Periode</CollectionTableHead><CollectionTableHead>Tenggat</CollectionTableHead><CollectionTableHead className="text-right">Tindakan</CollectionTableHead></CollectionTableHeaderRow></CollectionTableHeader>
   <TableBody>{data.items.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Tidak ada pekerjaan yang sesuai filter.</TableCell></TableRow> : data.items.map(item => <TableRow key={item.key}>
    <TableCell className="min-w-56 max-w-lg whitespace-normal"><p className="font-medium wrap-break-word">{item.mitigationAction || item.riskTitle}</p>{item.mitigationAction ? <p className="mt-1 text-muted-foreground">{item.riskTitle}</p>:null}<p className="mt-1 text-xs text-muted-foreground">{[item.riskCode,item.responsibility==="personal"?"Untuk saya":"Perlu ditangani unit"].filter(Boolean).join(" · ")}</p></TableCell>
    <TableCell>{item.period || "—"}</TableCell>
    <TableCell>{item.dueDate ? <div className="space-y-1"><p>{new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeZone:"Asia/Jakarta"}).format(new Date(`${item.dueDate}T12:00:00+07:00`))}</p>{item.kind==="mitigation_report"?<Badge variant={item.dueDate<today?"destructive":"secondary"}>{deadlineLabel(item.dueDate,today)}</Badge>:null}</div>:"—"}</TableCell>
    <TableCell className="text-right"><ActionButton variant="outline" disabled={Boolean(busyKey)} loading={busyKey===item.key} onClick={()=>onOpen(item)}>{item.actionLabel}</ActionButton></TableCell>
   </TableRow>)}</TableBody>
  </Table>
  <CollectionPagination itemLabel="pekerjaan" page={data.page} pageSize={pageSize} pageSizeOptions={[10,20,50]} total={data.total} disabled={loading} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}/>
 </CollectionTableCard>;
}
