"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const views = [
  { value: "all", label: "Semua risiko" },
  { value: "mine", label: "Risiko saya" },
  { value: "action", label: "Perlu tindakan" },
  { value: "monitoring", label: "Dalam pemantauan" },
  { value: "archived", label: "Diarsipkan" },
] as const;

export function DropdownMenuExample() {
  const [view, setView] = useState("all");
  const selectedView = views.find((item) => item.value === view) ?? views[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md" className="min-w-44 justify-between">
          {selectedView.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <DropdownMenuRadioGroup value={view} onValueChange={setView}>
          {views.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
