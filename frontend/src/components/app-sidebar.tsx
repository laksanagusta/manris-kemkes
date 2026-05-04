"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Inbox,
  ShieldAlert,
  ClipboardCheck,
  BookOpen,
  FileBarChart,
  ClipboardList,
  AlertTriangle,
  FileText,
  FileSearch,
  Users,
  Settings2,
  ChevronDown,
  Calculator,
  Building2,
  FileSignature,
  ClipboardPenLine,
  Goal,
  GitBranch,
} from "lucide-react";
import { adminMenuGroup, mainMenuItems } from "@/lib/app-navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo, useState } from "react";
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
  items?: NavItem[];
  collapsible?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Inbox,
  ShieldAlert,
  ClipboardCheck,
  BookOpen,
  FileBarChart,
  ClipboardList,
  AlertTriangle,
  FileSignature,
  ClipboardPenLine,
  Goal,
  GitBranch,
  Users,
  Building2,
  Settings2,
};

const reportsNavigation: NavGroup = {
  title: "LAPORAN",
  items: [
    {
      label: "Analisis Risiko",
      href: "/reports",
      icon: ShieldAlert,
    },
    {
      label: "Laporan Formal",
      href: "/reports/formal",
      icon: FileText,
    },
    {
      label: "Monitoring Kepatuhan",
      href: "/reports/compliance-monitoring",
      icon: ClipboardCheck,
    },
    {
      label: "Detail Siklus Risiko",
      href: "/reports/cycle-detail",
      icon: GitBranch,
    },
  ],
};

const dashboardNavigation: NavItem = {
  label: "Dashboard",
  href: "/overview",
  icon: LayoutDashboard,
};

const navigation: NavGroup[] = [
  ...mainMenuItems.map((group) => {
    const items = group.items
      .filter((item) => item.href !== "/overview" && item.href !== "/reports")
      .map((item) => ({
        ...item,
        icon: iconMap[item.icon] ?? LayoutDashboard,
      }));

    return {
      ...group,
      items,
    };
  }),
  reportsNavigation,
  {
    title: "AI & Automation",
    items: [
      {
        label: "Meeting",
        href: "/minutes",
        icon: FileText,
        matchHrefs: ["/minutes", "/intelligence/transcript"],
      },
      {
        label: "Document Intelligence",
        href: "/intelligence/document",
        icon: FileSearch,
        matchHrefs: ["/intelligence/document"],
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
    ...adminMenuGroup,
    icon: Settings2,
    items: adminMenuGroup.items.map((item) => ({
      ...item,
      icon: iconMap[item.icon] ?? Settings2,
    })),
  },
];

const allNavHrefs = [
  dashboardNavigation.href,
  ...navigation.flatMap((group) => [
    ...(group.items ?? []).flatMap((item) => item.matchHrefs ?? [item.href]),
  ]),
];

const defaultCollapsedNodes = new Set(
  navigation.map((group) => `group:${group.title}`),
);

const utilityLinks: NavItem[] = [
  {
    label: "Panduan",
    href: "/panduan/risiko",
    icon: BookOpen,
  },
];

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function splitHref(href: string) {
  const [path, fragment = ""] = href.split("#");
  return { path, fragment };
}

function matchesLocation(pathname: string, hash: string, href: string) {
  const { path, fragment } = splitHref(href);
  if (!matchesPath(pathname, path)) {
    return false;
  }

  if (!fragment) {
    return true;
  }

  return hash === `#${fragment}` || hash === fragment;
}

function isNavItemActive(pathname: string, hash: string, item: NavItem) {
  const candidateHrefs = item.matchHrefs ?? [item.href];
  const matchedHref = candidateHrefs.find((href) =>
    matchesLocation(pathname, hash, href),
  );
  if (!matchedHref) return false;

  if (matchedHref.includes("#")) {
    return true;
  }

  const hasMoreSpecificMatch = allNavHrefs.some(
    (candidate) =>
      candidate !== matchedHref &&
      !candidate.includes("#") &&
      candidate.startsWith(`${matchedHref}/`) &&
      matchesPath(pathname, candidate),
  );

  return !hasMoreSpecificMatch;
}

function NavLink({
  item,
  collapsed,
  currentHash,
  badgeOverride,
}: {
  item: NavItem;
  collapsed: boolean;
  currentHash: string;
  badgeOverride?: number;
}) {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, currentHash, item);
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
        "group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <item.icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
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

function useLocationHash() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => {
      setHash(window.location.hash);
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);

    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, []);

  return hash;
}

export function AppSidebar({
  collapsed = false,
  inboxBadge = 0,
}: {
  collapsed?: boolean;
  inboxBadge?: number;
}) {
  const { user } = useAuth();
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(
    () => new Set(defaultCollapsedNodes),
  );
  const currentHash = useLocationHash();
  const visibleNavigation = useMemo(
    () =>
      user?.role === "superadmin"
        ? navigation
        : navigation.filter((group) => group.title !== adminMenuGroup.title),
    [user?.role],
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

  const toggleNode = (key: string) => {
    setCollapsedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] min-h-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Navigation */}
      <ScrollArea className="min-h-0 flex-1 px-3 py-4">
        <nav className="space-y-5">
          <div>
            <NavLink
              item={dashboardNavigation}
              collapsed={collapsed}
              currentHash={currentHash}
            />
          </div>
          {visibleNavigation.map((group) => {
            const groupKey = `group:${group.title}`;
            const isGroupCollapsed = collapsedNodes.has(groupKey);
            const isReportGroup = group.title === reportsNavigation.title;
            return (
              <div key={group.title}>
                {isReportGroup ? (
                  collapsed ? (
                    <>
                      <Separator className="mb-2 bg-sidebar-border" />
                      <div className="space-y-0.5">
                        {group.items?.map((item) => (
                          <NavLink
                            key={item.href}
                            item={item}
                            collapsed={collapsed}
                            currentHash={currentHash}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleNode(groupKey)}
                        className="mb-2 flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold tracking-widest uppercase text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/60"
                        aria-expanded={!isGroupCollapsed}
                      >
                        <span className="flex items-center gap-2">
                          {group.icon && <group.icon className="size-4" />}
                          {group.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-3 transition-transform duration-200",
                            isGroupCollapsed && "-rotate-90",
                          )}
                        />
                      </button>
                      {!isGroupCollapsed && (
                        <div className="space-y-0.5">
                          {group.items?.map((item) => (
                            <NavLink
                              key={item.href}
                              item={item}
                              collapsed={collapsed}
                              currentHash={currentHash}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <>
                    {!collapsed && (
                      <button
                        type="button"
                        onClick={() => toggleNode(groupKey)}
                        className="mb-2 flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/60"
                        aria-expanded={!isGroupCollapsed}
                      >
                        <span className="flex items-center gap-2">
                          {group.icon && <group.icon className="size-4" />}
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
                    {collapsed && (
                      <Separator className="mb-2 bg-sidebar-border" />
                    )}
                    {!isGroupCollapsed && (
                      <div className="space-y-0.5">
                        {group.items?.map((item) => (
                          <NavLink
                            key={item.href}
                            item={item}
                            collapsed={collapsed}
                            currentHash={currentHash}
                            badgeOverride={
                              item.href === "/inbox" ? inboxBadge : undefined
                            }
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="mb-3">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase">
              Bantuan
            </p>
          )}
          <div className="space-y-0.5">
            {utilityLinks.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                currentHash={currentHash}
              />
            ))}
          </div>
        </div>
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
