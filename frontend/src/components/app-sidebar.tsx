"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Inbox,
  ShieldAlert,
  ClipboardCheck,
  BookOpen,
  FileBarChart,
  AlertTriangle,
  FileText,
  ClipboardList,
  TrendingUp,
  Users,
  Settings2,
  ChevronDown,
  Bot,
  Calculator,
  Building2,
  FileSignature,
} from "lucide-react";
import { mainMenuItems } from "@/lib/app-navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  matchHrefs?: string[];
}

interface NavGroup {
  title: string;
  icon?: React.ElementType;
  items: NavItem[];
  collapsible?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Inbox,
  ShieldAlert,
  ClipboardCheck,
  BookOpen,
  FileBarChart,
  AlertTriangle,
  ClipboardList,
  FileSignature,
};

const navigation: NavGroup[] = [
  ...mainMenuItems.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      icon: iconMap[item.icon] ?? LayoutDashboard,
    })),
  })),
  {
    title: "AI & Automation",
    icon: Bot,
    items: [
      {
        label: "Meeting",
        href: "/minutes",
        icon: FileText,
        matchHrefs: ["/minutes", "/intelligence/transcript"],
      },
      // {
      //   label: "Predictive Scoring",
      //   href: "/intelligence/predictive",
      //   icon: TrendingUp,
      // },
      {
        label: "Cost Benefit Analysis",
        href: "/intelligence/cba",
        icon: Calculator,
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    icon: Settings2,
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Organizations", href: "/admin/organizations", icon: Building2 },
      // { label: "Form Builder", href: "/admin/forms", icon: FileText },
      { label: "Settings", href: "/admin/settings", icon: Settings2 },
    ],
  },
];

const allNavHrefs = navigation.flatMap((group) =>
  group.items.flatMap((item) => item.matchHrefs ?? [item.href]),
);

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavItemActive(pathname: string, item: NavItem) {
  const candidateHrefs = item.matchHrefs ?? [item.href];
  const matchedHref = candidateHrefs.find((href) =>
    matchesPath(pathname, href),
  );
  if (!matchedHref) return false;

  const hasMoreSpecificMatch = allNavHrefs.some(
    (candidate) =>
      candidate !== matchedHref &&
      candidate.startsWith(`${matchedHref}/`) &&
      matchesPath(pathname, candidate),
  );

  return !hasMoreSpecificMatch;
}

function NavLink({
  item,
  collapsed,
  badgeOverride,
}: {
  item: NavItem;
  collapsed: boolean;
  badgeOverride?: number;
}) {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, item);
  const displayBadge =
    badgeOverride !== undefined
      ? badgeOverride
      : item.badge
        ? parseInt(item.badge)
        : undefined;

  const content = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <item.icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          isActive
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70",
        )}
      />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {displayBadge !== undefined && displayBadge > 0 && (
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-sidebar-primary text-[10px] font-semibold text-sidebar-primary-foreground">
              {displayBadge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p>{item.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function AppSidebar({
  collapsed = false,
  inboxBadge = 0,
}: {
  collapsed?: boolean;
  inboxBadge?: number;
}) {
  const { user } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

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

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {navigation.map((group) => {
            const isGroupCollapsed = collapsedGroups.has(group.title);
            return (
              <div key={group.title}>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="mb-2 flex w-full items-center justify-between px-3 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase hover:text-sidebar-foreground/60 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      {group.icon && <group.icon className="size-3" />}
                      {group.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform duration-200",
                        isGroupCollapsed && "-rotate-90",
                      )}
                    />
                  </button>
                )}
                {collapsed && <Separator className="mb-2 bg-sidebar-border" />}
                {!isGroupCollapsed && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        collapsed={collapsed}
                        badgeOverride={
                          item.href === "/inbox" ? inboxBadge : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">
              {getInitials(user?.name)}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-sidebar-foreground">
                {user?.name || "User"}
              </span>
              <span className="text-[10px] text-sidebar-foreground/50">
                {user?.role || "Unknown"}
              </span>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary cursor-pointer">
                {getInitials(user?.name)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{user?.name || "User"}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
