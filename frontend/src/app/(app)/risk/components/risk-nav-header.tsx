"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  History,
  Info
} from "@/components/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Sub-navigation setup based on the PRD
const navItems = [
  { label: "My Risk Register", href: "/risk/register", type: "table" as const },
  { label: "Draft & Approval", href: "/risk/draft", type: "list" as const },
  { label: "Version History", href: "/risk/history", type: "history" as const }
];

export function RiskNavHeader({ title, description, badge }: { title: string, description: string, badge?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title">{title}</h1>
          {badge && <Badge variant="outline" className="text-xs bg-primary/10 text-primary uppercase font-bold tracking-wider">{badge}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      </div>

      <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border/50 backdrop-blur-sm self-start md:self-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold transition-all rounded-md flex items-center gap-2",
                isActive
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {item.type === "history" ? <History className="size-3.5" /> : (
                  item.type === "list" ? <Info className="size-3.5" /> : <GitBranch className="size-3.5" />
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
