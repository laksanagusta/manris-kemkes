"use client";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "@/components/shared/icons";

export function CommentComposer({ message, stakeholder, busy = false, error, onMessageChange, onStakeholderChange, onSubmit }: {
  message: string;
  stakeholder: string;
  busy?: boolean;
  error?: string;
  onMessageChange: (value: string) => void;
  onStakeholderChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const id = useId();
  return (
    <div className="mt-4 min-w-0 rounded-2xl bg-card-subtle-surface p-1" aria-label="Tulis catatan">
      <div className="px-3 py-2 text-sm font-medium text-foreground">Komentar</div>
      <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring/30">
        <div className="mx-3 flex min-w-0 flex-wrap items-center gap-x-2 border-b border-border py-2">
          <label htmlFor={`${id}-party`} className="shrink-0 text-sm text-muted-foreground">Pihak terkait:</label>
          <Input id={`${id}-party`} value={stakeholder} onChange={e => onStakeholderChange(e.target.value)} disabled={busy} placeholder="Nama atau unit" required className="min-w-0 flex-1 basis-36 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent" />
        </div>
        <label htmlFor={`${id}-message`} className="sr-only">Isi catatan</label>
        <Textarea id={`${id}-message`} value={message} onChange={e => onMessageChange(e.target.value)} disabled={busy} placeholder="Tulis catatan..." rows={4} className="max-h-80 min-h-32 resize-y overflow-y-auto rounded-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0 dark:bg-transparent" required aria-describedby={error ? `${id}-error` : undefined} />
        <div className="flex flex-wrap items-center justify-end gap-3 px-3 pb-3 pt-1">
          <Button type="button" variant="secondary" onClick={onSubmit} disabled={busy || !message.trim() || !stakeholder.trim()} aria-busy={busy} aria-label="Kirim catatan" className="rounded-lg">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {busy ? "Mengirim..." : "Kirim"}
          </Button>
        </div>
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="px-3 py-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
