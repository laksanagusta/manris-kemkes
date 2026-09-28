"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type DialogActionItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  onSelect: () => void;
};

export function DialogActionList({
  items,
  className,
}: {
  items: ReadonlyArray<DialogActionItem>;
  className?: string;
}) {
  return (
    <Card className={cn("w-52", className)}>
      <CardContent className="flex flex-col gap-1">
      {items.map((item) => (
        <Button
          key={item.id}
          type="button"
          disabled={item.disabled}
          onClick={item.onSelect}
          variant={item.tone === "danger" ? "destructive" : "ghost"}
          className="w-full justify-start"
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
      </CardContent>
    </Card>
  );
}
