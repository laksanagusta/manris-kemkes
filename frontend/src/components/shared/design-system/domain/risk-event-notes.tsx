"use client";
import { useEffect, useRef, useState } from "react";
import type { RiskEventNote } from "@/types/risk-event";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ActionButton } from "../actions/action-button";

export function RiskEventNotes({ notes, canWrite, loading, error, onReload, onSave, draftKey }: {
  notes: RiskEventNote[]; canWrite: boolean; loading?: boolean; error?: string; onReload?: () => void;
  onSave: (body: string, requestId: string) => Promise<void>;
  draftKey?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const request = useRef<{ body: string; id: string } | null>(null);
  const restoredKey = useRef("");
  useEffect(() => {
    if (!draftKey || !canWrite) return;
    const key = `manris:event-note:${draftKey}`;
    try {
      if (restoredKey.current !== key) {
        restoredKey.current = key;
        const saved = sessionStorage.getItem(key);
        if (saved) {
          const value = JSON.parse(saved);
          if (typeof value.body === "string" && value.body.length <= 2000) {
            setBody(value.body); setEditing(true);
            if (value.request?.body === value.body.trim() && typeof value.request?.id === "string") request.current = value.request;
          }
        }
        return;
      }
      if (body.trim()) sessionStorage.setItem(key, JSON.stringify({body, request: request.current}));
      else sessionStorage.removeItem(key);
    } catch { /* Storage may be unavailable; the leave guard still protects text. */ }
  }, [body, draftKey, canWrite]);
  useEffect(() => {
    if (!editing || !body.trim()) return;
    function unload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    function leave(event: MouseEvent) {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const anchor = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin || target.pathname + target.search === location.pathname + location.search) return;
      if (!window.confirm("Catatan belum disimpan. Tetap tinggalkan halaman?")) {event.preventDefault();event.stopPropagation();}
    }
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => {window.removeEventListener("beforeunload", unload);document.removeEventListener("click", leave, true);};
  }, [editing, body]);
  async function save() {
    if (saving || !body.trim()) return;
    if (request.current?.body !== body.trim()) request.current = { body: body.trim(), id: crypto.randomUUID() };
    if (draftKey) { try {sessionStorage.setItem(`manris:event-note:${draftKey}`, JSON.stringify({body,request:request.current}));} catch { /* Retry identity remains in memory. */ } }
    setSaving(true); setSaveError("");
    try { await onSave(request.current.body, request.current.id); if (draftKey) { try {sessionStorage.removeItem(`manris:event-note:${draftKey}`);} catch { /* No persisted draft when storage is unavailable. */ } } setBody(""); setEditing(false); request.current = null; }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : "Catatan belum berhasil disimpan. Coba lagi."); }
    finally { setSaving(false); }
  }
  return <details className="group rounded-xl border border-border bg-card p-4">
    <summary className="cursor-pointer text-sm font-medium">Catatan tambahan</summary>
    <div className="mt-4 space-y-4">
      {loading ? <p role="status" className="text-sm text-muted-foreground">Memuat catatan…</p> : error ? <div role="alert" className="space-y-2 text-sm"><p>{error}</p><ActionButton onClick={onReload}>Coba lagi</ActionButton></div> : notes.length ? <ol className="space-y-4">{notes.map(note => <li key={note.id} className="space-y-1 text-sm"><p className="whitespace-pre-wrap break-words">{note.body}</p><p className="text-xs text-muted-foreground">{note.createdByName || "Pengguna"} · <time dateTime={note.createdAt}>{new Intl.DateTimeFormat("id-ID", {dateStyle:"medium", timeStyle:"short", timeZone:"Asia/Jakarta"}).format(new Date(note.createdAt))}</time></p></li>)}</ol> : <p className="text-sm text-muted-foreground">Belum ada catatan tambahan.</p>}
      {canWrite && !editing ? <ActionButton onClick={() => setEditing(true)}>Tambah catatan</ActionButton> : null}
      {canWrite && editing ? <div className="space-y-3"><Label htmlFor="event-note">Catatan</Label><p id="event-note-help" className="text-xs text-muted-foreground">Jelaskan koreksi atau informasi tambahan. Catatan awal tetap tersimpan.</p><Textarea id="event-note" value={body} maxLength={2000} disabled={saving} aria-describedby="event-note-help" onChange={event => setBody(event.target.value)} />{saveError ? <p role="alert" className="text-sm text-destructive">{saveError}</p> : null}<div className="flex gap-2"><ActionButton loading={saving} disabled={saving || !body.trim()} onClick={() => void save()}>Simpan</ActionButton><ActionButton disabled={saving} onClick={() => {setEditing(false);setBody("");setSaveError("");request.current=null;}}>Batal</ActionButton></div></div> : null}
    </div>
  </details>;
}
