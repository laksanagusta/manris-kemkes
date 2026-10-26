"use client";
import { Button } from "@/components/ui/button";
export default function AgentError({ reset }: { reset: () => void }) {
  return <div className="flex h-full flex-col items-center justify-center gap-4"><p>Percakapan belum dapat ditampilkan.</p><Button variant="outline" onClick={reset}>Muat ulang percakapan</Button></div>;
}
