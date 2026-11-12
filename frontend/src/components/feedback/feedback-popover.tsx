"use client";

import { useId, useRef, useState, type FormEvent, type ReactElement } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import styles from "./feedback.module.css";

export type FeedbackSubmission = { message: string; requestId: string };

export function FeedbackPopover({
  children,
  onSubmit,
  side = "right",
  align = "end",
  preview = false,
}: {
  children: ReactElement;
  onSubmit: (input: FeedbackSubmission) => Promise<void>;
  side?: "right" | "top";
  align?: "start" | "end";
  preview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submission = useRef<FeedbackSubmission | null>(null);
  const submitting = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || submitting.current) return;
    // Reuse the key on retry if the response was lost after a successful save.
    if (submission.current?.message !== trimmed) {
      submission.current = { message: trimmed, requestId: crypto.randomUUID() };
    }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      await onSubmit(submission.current);
      setMessage("");
      submission.current = null;
      setOpen(false);
      toast.success(preview ? "Pratinjau selesai. Tidak ada feedback yang dikirim." : "Terima kasih! Feedback Anda sudah terkirim.");
    } catch {
      setError("Feedback belum terkirim. Coba kirim kembali; tulisan Anda tetap tersimpan di sini.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        aria-label="Feedback"
        side={side}
        align={align}
        sideOffset={10}
        collisionPadding={12}
        className={styles.popover}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          textarea.current?.focus();
        }}
      >
        <form onSubmit={submit} className={styles.form} aria-busy={pending}>
          <label htmlFor={id} className="sr-only">Feedback</label>
          <Textarea
            ref={textarea}
            id={id}
            placeholder="Feedback"
            value={message}
            maxLength={2000}
            onChange={(event) => { setMessage(event.target.value); setError(null); }}
            readOnly={pending}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className={styles.textarea}
          />
          <div className={styles.separator} aria-hidden="true" />
          <div className={styles.footer}>
            {error && <p id={`${id}-error`} role="alert" className="w-full text-sm text-destructive">{error}</p>}
            <Button data-feedback-send type="submit" aria-label={pending ? "Mengirim feedback" : "Send feedback"} disabled={!message.trim() || pending} className={styles.send}>
              {pending && <Spinner aria-hidden="true" />}
              <span role="status">{pending ? "Mengirim…" : "Send feedback"}</span>
            </Button>
          </div>
        </form>
        <PopoverPrimitive.Arrow width={16} height={8} className="fill-sidebar stroke-border" strokeWidth={1} />
      </PopoverContent>
    </Popover>
  );
}
