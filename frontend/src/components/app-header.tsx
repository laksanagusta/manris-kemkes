"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { breadcrumbMap } from "@/lib/app-navigation";

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
  const router = useRouter();
  const { logout, user } = useAuth();

  // Get initials from user name (e.g., "Dr. Farah Indah" -> "FI")
  const getInitials = (name: string | undefined): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .filter((part) => part.length > 0 && !part.endsWith("."))
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  };
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
    <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background/80 pr-6 pl-0 backdrop-blur-xl">
      {/* Logo */}
      <div
        className={cn(
          "flex h-full shrink-0 items-center gap-3 transition-all duration-300",
          collapsed ? "w-16 justify-center" : "pl-6 pr-2",
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-primary/10 p-1.5">
          <Image
            src="/logo.svg"
            alt="MANRIS logo"
            width={20}
            height={20}
            className="object-contain"
          />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden whitespace-nowrap">
            <span className="text-sm font-bold tracking-tight text-foreground">
              MR-V0
            </span>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleCollapse}
        className="text-muted-foreground shrink-0"
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </Button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm overflow-hidden whitespace-nowrap">
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
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsDark(!isDark)}
          className="text-muted-foreground"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {getInitials(user?.name)}
              </div>
              <span className="hidden text-xs font-medium md:inline">
                {user?.name || "User"}
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
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              <LogOut className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
