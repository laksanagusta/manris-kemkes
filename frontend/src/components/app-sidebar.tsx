"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Inbox,
  Agreement03,
  Alert02,
  Certificate01,
  Folder01,
  ShieldAlert,
  ClipboardCheck,
  BookOpen,
  FileBarChart,
  ClipboardList,
  FileText,
  MonitorDot,
		Users,
		Settings2,
		Building2,
  FileSignature,
  ClipboardPenLine,
  GitBranch,
  LogOut,
  HelpCircle,
} from "@/components/shared/icons";
import { DitherAvatar } from "@/components/dither-kit/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { adminMenuGroup, mainMenuItems } from "@/lib/app-navigation";
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
import { SidebarNavItem } from "@/components/shared/sidebar-nav-item";
import { useEffect, useMemo, useState } from "react";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { useSettings } from "@/components/settings/settings-provider";
import { useAuth } from "@/contexts/auth-context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  matchHrefs?: string[];
  adminOnly?: boolean;
}

interface NavGroup {
  title?: string;
  icon?: React.ElementType;
  items?: NavItem[];
  collapsible?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Inbox,
  Agreement03,
  Alert02,
  Certificate01,
  Folder01,
  ShieldAlert,
  ClipboardCheck,
  BookOpen,
  FileBarChart,
  ClipboardList,
  FileSignature,
  ClipboardPenLine,
  GitBranch,
  FileText,
  MonitorDot,
  Users,
  Building2,
  Settings2,
};

const reportsNavigation: NavGroup = {
  title: "LAPORAN",
  items: [
    {
      label: "Ringkasan Risiko",
      href: "/reports",
      icon: FileBarChart,
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

const approvalNavigation = managementRiskNavigation.filter(
  (item) => item.href === "/inbox",
);

const operationalNavigation = managementRiskNavigation.filter(
  (item) => item.href !== "/inbox",
);

const navigation: NavGroup[] = [
  {
    items: [dashboardNavigation, ...approvalNavigation],
  },
  {
    title: "OPERASIONAL",
    items: operationalNavigation,
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
    title: "OTOMASI",
    items: [
      {
        label: "MoM",
        href: "/minutes",
        icon: FileText,
        matchHrefs: ["/minutes", "/intelligence/transcript"],
      },
      // {
      //   label: "Predictive Scoring",
      //   href: "/intelligence/predictive",
      //   icon: TrendingUp,
      // },
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



const utilityLinks: NavItem[] = [
  {
    label: "Panduan",
    href: "/panduan/pengenalan",
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
          <Badge variant="secondary" className="ml-auto tabular-nums group-data-[collapsible=icon]:hidden">
            {displayBadge}
          </Badge>
        ) : undefined
      }
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
  const { openSettings } = useSettings();
  const currentHash = useLocationHash();
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const visibleNavigation = useMemo(() => {
    const baseNavigation = navigation
      .map((group) => ({
        ...group,
        items: group.items?.filter(
          (item) => !item.adminOnly || user?.role === "superadmin",
        ),
      }))
      .filter((group) => (group.items?.length ?? 0) > 0);

    if (!aiFeaturesDisabled) {
      return baseNavigation;
    }

    return baseNavigation.filter((group) => group.title !== "OTOMASI");
  }, [aiFeaturesDisabled, user]);



  return (
    <Sidebar
      className="md:top-0 md:h-svh md:border-r-[0.5px] md:border-border"
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="h-14 justify-center px-2">
        <Link
          href="/overview"
          className="font-logo hidden min-w-0 items-center rounded-md px-2 py-1 text-2xl leading-7 font-semibold lowercase tracking-[-0.4px] text-foreground outline-hidden transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring md:flex md:group-data-[state=collapsed]/sidebar-wrapper:hidden"
        >
          <span className="min-w-0 truncate">Manrisk</span>
        </Link>
        <SidebarMenu className="md:hidden">
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Manrisk">
              <Link href="/overview">
                <Image
                  src="/logo.svg"
                  alt=""
                  width={20}
                  height={20}
                  priority
                  className="size-5 shrink-0 object-contain"
                />
                <span className="text-lg leading-6 font-normal text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  Manrisk
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 pt-2">
            {visibleNavigation.map((group) => (
              <SidebarGroup key={group.title ?? group.items?.[0]?.href}>
                {group.title ? (
                  <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                ) : null}

                <SidebarMenu className="gap-1">
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

      <SidebarFooter className="relative isolate gap-2 px-2 py-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-10 z-10 h-10 bg-gradient-to-b from-transparent via-sidebar/75 to-sidebar backdrop-blur-md"
        />
        {user && (
          <div className="flex min-w-0 items-center justify-center gap-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="min-w-0 flex-1" aria-label="Open user menu">
                  <span className="inline-flex shrink-0 items-center justify-center">
                    <DitherAvatar name={user?.name || "User"} size={24} className="overflow-hidden rounded-full" />
                  </span>
                  <span className="min-w-0 flex-1 translate-y-px truncate text-sm leading-5 font-normal text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                    {user?.name || "User"}
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" sideOffset={4} className="w-56">
                <DropdownMenuItem onClick={() => openSettings("account")}>
                  <Settings2 className="size-4" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                >
                  <LogOut className="size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden" aria-label="Buka panduan" title="Panduan">
                  <HelpCircle aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                sideOffset={8}
                className="w-52"
              >
                <div className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
                  Bantuan
                </div>
                {utilityLinks.map(({ label, href, icon: Icon }) => (
                  <Button key={href} asChild variant="ghost" className="w-full justify-start">
                    <Link href={href}><Icon data-icon="inline-start" aria-hidden="true" />{label}</Link>
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
