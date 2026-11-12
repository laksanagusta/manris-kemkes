import type { ReactNode } from "react";
import { DitherAvatar } from "@/components/dither-kit/avatar";

export function CommentThreadItem({ author, timestamp, dateTime, children, onOpen }: {
  author: string;
  timestamp: string;
  dateTime?: string;
  children: ReactNode;
  onOpen?: () => void;
}) {
  return (
    <article data-comment-item className="relative flex min-w-0 items-start gap-2.5 py-3">
      <DitherAvatar name={author} size={28} animate={false} className="relative z-10 mt-0.5 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-5">
          {onOpen ? <button type="button" onClick={onOpen} className="rounded-sm text-left font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Buka detail catatan dari ${author}`}>{author}</button> : <span className="font-medium text-foreground">{author}</span>}
          <time dateTime={dateTime} title={dateTime} className="text-xs text-muted-foreground">{timestamp}</time>
        </div>
        <div className="whitespace-pre-wrap break-words text-sm leading-5 text-secondary-foreground">{children}</div>
      </div>
    </article>
  );
}
