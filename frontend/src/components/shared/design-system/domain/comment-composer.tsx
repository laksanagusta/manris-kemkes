"use client";
import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUp } from "@/components/shared/icons";

export function CommentComposer({ message, busy = false, error, onMessageChange, onSubmit }: {
  message: string;
  busy?: boolean;
  error?: string;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const id = useId();
  return (
    <div className="mt-4 space-y-2" aria-label="Tulis catatan">
      <div data-comment-composer className="relative min-w-0">
        <label htmlFor={`${id}-message`} className="sr-only">Isi catatan</label>
        <Textarea id={`${id}-message`} value={message} onChange={e => onMessageChange(e.target.value)} disabled={busy} placeholder="Tulis komentar…" rows={1} required aria-describedby={error ? `${id}-error` : undefined} />
        <div className="absolute bottom-3 end-4">
          <Button type="button" variant="ghost" size="icon-xs" onClick={onSubmit} disabled={busy || !message.trim()} aria-busy={busy} aria-label="Kirim catatan" data-comment-send>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
          </Button>
        </div>
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
