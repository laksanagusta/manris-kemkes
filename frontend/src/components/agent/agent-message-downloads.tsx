"use client";

import { useEffect, useRef, useState } from "react";
import { agentApi } from "@/lib/agent-api";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Loader2 } from "@/components/shared/icons";
import { agentError } from "./use-agent-data";

type DownloadFormat = "xlsx" | "pdf";

export function AgentDownloadMenu({ onDownload, exporting = null, error = "" }: { onDownload: (format: DownloadFormat) => void; exporting?: DownloadFormat | null; error?: string }) {
  return <div className="agent-message-downloads"><div className="flex flex-wrap items-center gap-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" disabled={!!exporting} aria-busy={!!exporting || undefined} aria-label="Unduh jawaban" title="Unduh jawaban">{exporting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}</Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onSelect={() => onDownload("xlsx")}>Excel</DropdownMenuItem><DropdownMenuItem onSelect={() => onDownload("pdf")}>PDF</DropdownMenuItem></DropdownMenuContent></DropdownMenu>{exporting && <p className="text-xs text-muted-foreground" role="status">Menyiapkan {exporting === "xlsx" ? "Excel" : "PDF"}…</p>}</div>{error && <p className="mt-2 text-xs text-destructive" role="alert">Unduhan belum berhasil. {error}</p>}</div>;
}

export function AgentMessageDownloads({ conversationId, messageId, token, onAccessLost }: { conversationId: string; messageId: string; token: string; onAccessLost?: () => void }) {
  const [exporting, setExporting] = useState<DownloadFormat | null>(null);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const download = async (format: DownloadFormat) => {
    if (locked.current) return;
    locked.current = true; setExporting(format); setError("");
    try {
      const result = await agentApi.download(conversationId, messageId, format, token);
      if (!mounted.current) return;
      const url = URL.createObjectURL(result.blob);
      try {
        const link = document.createElement("a");
        link.href = url; link.download = result.filename;
        document.body.appendChild(link); link.click(); link.remove();
      } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch (cause) {
      if (mounted.current) {
        if (cause instanceof ApiError && [403, 404].includes(cause.status)) onAccessLost?.();
        setError(agentError(cause));
      }
    }
    finally { locked.current = false; if (mounted.current) setExporting(null); }
  };
  return <AgentDownloadMenu exporting={exporting} error={error} onDownload={(format) => { void download(format); }} />;
}
