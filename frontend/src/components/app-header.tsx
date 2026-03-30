"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Bell,
  ChevronRight,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inbox": "Inbox Persetujuan",
  "/risk": "Risk Assessments",
  "/risk/register": "Risk Register",
  "/risk/new": "New Risk",
  "/risk/history": "Risk History",
  "/kri": "KRI Monitor",
  "/controls": "Control Library",
  "/monitoring": "Monitoring & Review",
  "/monitoring/overdue": "Overdue",
  "/lessons": "Lessons Learned",
  "/reports": "Reports & Extract",
  "/incident": "Incident Register",
  "/incident/new": "New Incident",
  "/ai/transcript": "Transcript Analyzer",
  "/ai/minutes": "Meeting Minutes",
  "/ai/predictive": "Predictive Scoring",
  "/ai/fishbone": "Fishbone Generator",
  "/management/users": "User Management",
  "/management/criteria": "Scope & Criteria",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = breadcrumbMap[currentPath] || segment;
    crumbs.push({ label, path: currentPath });
  }

  return crumbs;
}

export function AppHeader({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleCollapse}
        className="text-muted-foreground"
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </Button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="size-3 text-muted-foreground/50" />
            )}
            <span
              className={
                index === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }
            >
              {crumb.label}
            </span>
          </div>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="h-8 w-56 pl-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
          />
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsDark(!isDark)}
          className="text-muted-foreground"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground"
        >
          <Bell className="size-4" />
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            5
          </span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                DA
              </div>
              <span className="hidden text-xs font-medium md:inline">
                Dika
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
