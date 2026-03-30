"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Inbox,
  ShieldAlert,
  Activity,
  ShieldCheck,
  ClipboardCheck,
  BookOpen,
  FileBarChart,
  AlertTriangle,
  FileText,
  CalendarClock,
  TrendingUp,
  Users,
  Settings2,
  ChevronDown,
  Bot,
  Shield,
  Calculator,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  title: string;
  icon?: React.ElementType;
  items: NavItem[];
  collapsible?: boolean;
}

const navigation: NavGroup[] = [
  {
    title: "MAIN MENU",
    items: [
      { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
      { label: "Inbox Persetujuan", href: "/inbox", icon: Inbox, badge: "3" },
      { label: "Risk Register", href: "/risk/register", icon: ShieldAlert },
      { label: "KRI Monitor", href: "/compliance/kri", icon: Activity },
      { label: "Control Library", href: "/compliance/controls", icon: ShieldCheck },
      { label: "Compliance Monitoring", href: "/compliance/monitoring", icon: ClipboardCheck },
      { label: "Incident Register", href: "/incidents", icon: AlertTriangle },
      { label: "Lessons Learned", href: "/incidents/lessons", icon: BookOpen },
      { label: "Reports & Extract", href: "/reports", icon: FileBarChart },
    ],
  },
  {
    title: "INTELLIGENCE",
    icon: Bot,
    items: [
      { label: "Transcript Analyzer", href: "/intelligence/transcript", icon: FileText },
      { label: "Meeting Minutes", href: "/intelligence/minutes", icon: CalendarClock },
      { label: "Predictive Scoring", href: "/intelligence/predictive", icon: TrendingUp },
      { label: "CBA Advokasi", href: "/intelligence/cba", icon: Calculator },
    ],
  },
  {
    title: "ADMINISTRATION",
    icon: Settings2,
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Settings", href: "/admin/settings", icon: Settings2 },
    ],
  },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  const content = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <item.icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          isActive
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
        )}
      />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-sidebar-primary text-[10px] font-semibold text-sidebar-primary-foreground">
              {item.badge}
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

export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 shadow-md p-1 border border-sidebar-border/50">
          <Image src="/logo.png" alt="Logo" width={24} height={24} className="object-contain" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              MANRIS
            </span>
            <span className="text-[10px] font-medium text-sidebar-foreground/50">
              Risk Management v2
            </span>
          </div>
        )}
      </div>

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
                        isGroupCollapsed && "-rotate-90"
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
              DA
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-sidebar-foreground">
                Dika Laksana
              </span>
              <span className="text-[10px] text-sidebar-foreground/50">
                Super Admin
              </span>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary cursor-pointer">
                DA
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Dika Laksana</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
