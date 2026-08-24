"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { LayoutGroup } from "motion/react";
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
  Calculator,
  Building2,
  FileSignature,
  ClipboardPenLine,
  Goal,
  GitBranch,
  LogOut,
  User as UserIcon,
} from "@/components/ui/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminMenuGroup, mainMenuItems, settingsMenuGroup } from "@/lib/app-navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarNavItem } from "@/components/ui/sidebar-nav-item";
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
  {
    title: "OPERASIONAL",
    items: [
      dashboardNavigation,
      ...managementRiskNavigation,
    ],
  },
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
  {
    ...settingsMenuGroup,
    items: settingsMenuGroup.items.map((item) => ({
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

  return (
    <SidebarNavItem
      badge={
        displayBadge !== undefined && displayBadge > 0 ? (
          <Badge
            tone="neutral"
            size="micro"
            className="relative z-10 ml-auto min-w-5 bg-sidebar-foreground px-1.5 leading-5 text-sidebar group-data-[collapsible=icon]:hidden"
          >
            {displayBadge}
          </Badge>
        ) : undefined
      }
      className="hover:bg-sidebar-accent active:bg-sidebar-accent"
      href={item.href}
      icon={item.icon}
      isActive={isActive}
      label={item.label}
    />
  );
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const scopeLabel = user?.orgName || user?.role || "Workspace";
  const normalizedScopeLabel = scopeLabel
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const currentHash = useLocationHash();
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const visibleNavigation = useMemo(() => {
    const baseNavigation = navigation.filter((group) => {
      if (group.title !== adminMenuGroup.title) return true;
      if (user?.role === "superadmin") return true;
      return false;
    });

    if (!aiFeaturesDisabled) {
      return baseNavigation;
    }

    return baseNavigation.filter((group) => group.title !== "AI & Automation");
  }, [aiFeaturesDisabled, user]);



  return (
    <Sidebar
      className={cn(
        "*:data-[slot=sidebar-inner]:bg-sidebar",
        "**:data-[slot=sidebar-menu-button]:[&>span]:text-sidebar-foreground/75",
      )}
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="h-14 justify-center px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Manris">
              <Link href="/overview">
                <Image
                  src="/logo.svg"
                  alt=""
                  width={20}
                  height={20}
                  priority
                  className="size-5 shrink-0 object-contain"
                />
                <span className="text-base font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  Manris
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <LayoutGroup id="sidebar-navigation">
        <SidebarContent>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-2">
              {visibleNavigation.map((group) => (
                <SidebarGroup key={group.title}>
                  <SidebarGroupLabel>
                    {group.title}
                  </SidebarGroupLabel>

                  <SidebarMenu>
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
                  </SidebarMenu>
                </SidebarGroup>
              ))}
            </div>
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="relative isolate space-y-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-10 z-10 h-10 bg-gradient-to-b from-transparent via-sidebar/75 to-sidebar backdrop-blur-md"
          />
          <SidebarGroup className="p-0">
            <SidebarGroupLabel>Bantuan</SidebarGroupLabel>
            <SidebarMenu>
              {utilityLinks.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  currentHash={currentHash}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {user && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-lg bg-white p-3 text-left smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30 transition-colors transition-transform duration-100 active:scale-[0.97] hover:bg-muted/30 focus-visible:outline-none"
                  aria-label="Open user menu"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex shrink-0 items-center justify-center">
                      <Avatar size="sm">
                        <AvatarFallback className="overflow-hidden bg-muted text-foreground">
                          <span className="sr-only">{user?.name || "User"}</span>
                        </AvatarFallback>
                      </Avatar>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-sidebar-foreground">
                        {user?.name || "User"}
                      </p>
                      <p className="truncate text-xs text-sidebar-foreground/60">
                        {normalizedScopeLabel}
                      </p>
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="font-display w-56 pl-2">
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
                <DropdownMenuItem onClick={() => router.push("/account")}>
                  <UserIcon className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings2 className="mr-2 size-4" />
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
          )}
        </SidebarFooter>
      </LayoutGroup>
    </Sidebar>
  );
}
