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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useMemo, useState } from "react";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
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
  FileSignature,
  ClipboardPenLine,
  Goal,
  GitBranch,
  FileText,
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
    // {
    //   label: "Laporan Formal",
    //   href: "/reports/formal",
    //   icon: FileText,
    // },
    {
      label: "Monitoring Kepatuhan",
      href: "/reports/compliance-monitoring",
      icon: ClipboardCheck,
    },
    // {
    //   label: "Detail Siklus Risiko",
    //   href: "/reports/cycle-detail",
    //   icon: GitBranch,
    // },
  ],
};

const dashboardNavigation: NavItem = {
  label: "Dashboard",
  href: "/overview",
  icon: LayoutDashboard,
};

const managementRiskGroup = mainMenuItems.find(
  (group) => group.title === "MANAJEMEN RISIKO",
);

const managementRiskNavigation: NavItem[] = (managementRiskGroup?.items ?? [])
  .filter((item) => item.href !== "/overview" && item.href !== "/reports")
  .map((item) => ({
    ...item,
    icon: iconMap[item.icon] ?? LayoutDashboard,
  }));

const navigation: NavGroup[] = [
  ...mainMenuItems
    .filter((group) => group.title !== "MANAJEMEN RISIKO")
    .map((group) => {
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
  ...managementRiskNavigation.flatMap((item) => item.matchHrefs ?? [item.href]),
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
  currentHash,
  badgeOverride,
}: {
  item: NavItem;
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
        "group flex h-8 items-center gap-2 rounded-md px-2 text-sm font-normal transition-colors duration-200",
        isActive
          ? "bg-sidebar-accent/70 text-sidebar-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
      )}
    >
      <item.icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          isActive
            ? "text-sidebar-foreground"
            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
        )}
      />
      <span className="truncate">{item.label}</span>
      {displayBadge !== undefined && displayBadge > 0 && (
        <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-sidebar-foreground px-1.5 text-[10px] font-semibold leading-5 text-sidebar">
          {displayBadge}
        </span>
      )}
    </Link>
  );

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

export function AppSidebar({ inboxBadge = 0 }: { inboxBadge?: number }) {
  const { user } = useAuth();
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(
    () => new Set(defaultCollapsedNodes),
  );
  const currentHash = useLocationHash();
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const visibleNavigation = useMemo(() => {
    const baseNavigation =
      user?.role === "superadmin"
        ? navigation
        : navigation.filter((group) => group.title !== adminMenuGroup.title);

    if (!aiFeaturesDisabled) {
      return baseNavigation;
    }

    return baseNavigation.filter((group) => group.title !== "AI & Automation");
  }, [aiFeaturesDisabled, user]);

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
    <div
      className={cn(
        "sticky top-[50px] z-40 hidden h-[calc(100vh-50px)] w-60 shrink-0 origin-left pr-0 transition-[width,padding] duration-300 ease-[cubic-bezier(0.31,0.1,0.08,0.96)] sm:block",
      )}
    >
      <aside className="font-display z-20 flex h-full flex-col border-r border-sidebar-border/70 bg-sidebar/95">
        <div className="flex min-h-0 flex-1 flex-col px-2 py-3">
          <div className="mb-3 space-y-2">
            <div className="space-y-0.5">
              <NavLink
                item={dashboardNavigation}
                currentHash={currentHash}
                badgeOverride={undefined}
              />
              {managementRiskNavigation.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  currentHash={currentHash}
                  badgeOverride={
                    item.href === "/inbox" ? inboxBadge : undefined
                  }
                />
              ))}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <nav className="space-y-4 pr-2">
              {visibleNavigation.map((group) => {
                const groupKey = `group:${group.title}`;
                const isGroupCollapsed = collapsedNodes.has(groupKey);

                return (
                  <section key={group.title} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleNode(groupKey)}
                      className="flex h-7 w-full items-center justify-between rounded-md px-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45 transition-colors hover:text-sidebar-foreground/70"
                      aria-expanded={!isGroupCollapsed}
                    >
                      <span>{group.title}</span>
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform duration-200",
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
                            currentHash={currentHash}
                            badgeOverride={
                              item.href === "/inbox" ? inboxBadge : undefined
                            }
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="mt-4 border-t border-sidebar-border/70 pt-3">
            <p className="mb-2 px-2 text-[11px] font-medium text-sidebar-foreground/45">
              Bantuan
            </p>
            <div className="space-y-0.5">
              {utilityLinks.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  currentHash={currentHash}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
