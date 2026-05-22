"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronsUpDown,
  Building2,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export function AppHeader() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const scopeLabel = user?.orgName || user?.role || "Workspace";

  const normalizedScopeLabel = scopeLabel
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[50px] items-center border-b border-border/70 bg-background/95 px-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-1.5">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 max-w-[14rem] shrink-0 items-center gap-1.5 rounded-md bg-muted/40 px-1.5 pr-2 text-left text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              aria-label="Open user menu"
            >
              <Avatar size="sm">
                <AvatarFallback className="overflow-hidden bg-[radial-gradient(circle_at_72%_28%,rgba(34,211,238,0.9),rgba(34,211,238,0)_42%),radial-gradient(circle_at_38%_76%,rgba(59,130,246,0.96),rgba(59,130,246,0)_50%),linear-gradient(135deg,rgba(110,231,183,0.98)_0%,rgba(45,212,191,0.96)_38%,rgba(34,211,238,0.94)_68%,rgba(37,99,235,0.98)_100%)]">
                  <span className="sr-only">{user?.name || "User"}</span>
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 flex-1 sm:block">
                <div className="truncate text-sm font-medium leading-5 text-foreground">
                  {user?.name || "User"}
                </div>
              </div>
              <ChevronsUpDown className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-1 px-2 py-1.5">
              <div className="truncate text-sm font-medium text-foreground">
                {user?.name || "User"}
              </div>
              <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Building2 className="size-3.5 shrink-0" />
                <span className="truncate">{normalizedScopeLabel}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                router.push("/admin/settings/organization-context")
              }
            >
              <Building2 className="mr-2 size-4" />
              Konteks Organisasi
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account")}>
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
