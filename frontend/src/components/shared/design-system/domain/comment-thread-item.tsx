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
    <article className="flex min-w-0 items-start gap-3 py-2">
      <DitherAvatar name={author} size={24} animate={false} className="mt-0.5 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-5">
          {onOpen ? <button type="button" onClick={onOpen} className="rounded-sm text-left font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Buka detail catatan dari ${author}`}>{author}</button> : <span className="font-medium text-foreground">{author}</span>}
          <time dateTime={dateTime} className="text-muted-foreground">{timestamp}</time>
        </div>
        <div className="whitespace-pre-wrap break-words text-sm leading-5 text-foreground">{children}</div>
      </div>
    </article>
  );
}
