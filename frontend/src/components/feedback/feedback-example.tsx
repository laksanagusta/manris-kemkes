"use client";

import { FeedbackMenu } from "./sidebar-feedback";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function FeedbackExample() {
  return (
    <div className="flex flex-col items-start gap-3">
      <TooltipProvider><SidebarProvider className="min-h-0">
        <div className="w-56 rounded-xl bg-sidebar p-2">
          <FeedbackMenu preview onSubmit={async () => {}} />
          <div className="flex h-10 items-center px-2 text-sm text-muted-foreground">Profil pengguna · contoh</div>
        </div>
      </SidebarProvider></TooltipProvider>
      <p className="text-xs text-muted-foreground">Pratinjau lokal · tidak disimpan ke server</p>
    </div>
  );
}
