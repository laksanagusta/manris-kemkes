"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { breadcrumbMap } from "@/lib/app-navigation";
import { ChevronDown } from "@/components/ui/icons";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";

const ALL_ORGANIZATIONS_VALUE = "__all_organizations__";

function getPageTitle(pathname: string) {
  const exactTitle = breadcrumbMap[pathname];
  if (exactTitle) {
    return exactTitle;
  }

  return (
    Object.entries(breadcrumbMap)
      .filter(([path]) => path !== "/" && pathname.startsWith(`${path}/`))
      .sort(([left], [right]) => right.length - left.length)
      .map(([, title]) => title)[0] ?? "Manajemen Risiko"
  );
}

export function AppTopbar() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationsError, setOrganizationsError] = useState(false);
  const defaultOrganizationId = user?.isGlobal
    ? ALL_ORGANIZATIONS_VALUE
    : user?.organizationId ?? user?.accessibleOrgIds[0] ?? "";
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    defaultOrganizationId,
  );

  useEffect(() => {
    setSelectedOrganizationId(defaultOrganizationId);
  }, [defaultOrganizationId]);

  useEffect(() => {
    if (!token || !user) {
      setOrganizations([]);
      return;
    }

    let cancelled = false;
    setOrganizationsLoading(true);
    setOrganizationsError(false);

    void listAllOrganizations(token)
      .then((result) => {
        if (!cancelled) {
          setOrganizations(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrganizations([]);
          setOrganizationsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrganizationsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const accessibleOrganizations = useMemo(() => {
    if (!user || user.isGlobal) {
      return organizations;
    }

    const accessibleIds = new Set([
      ...user.accessibleOrgIds,
      ...(user.organizationId ? [user.organizationId] : []),
    ]);

    return organizations.filter((organization) => accessibleIds.has(organization.id));
  }, [organizations, user]);

  const selectedOrganizationName =
    selectedOrganizationId === ALL_ORGANIZATIONS_VALUE
      ? "Semua Organisasi"
      : accessibleOrganizations.find(
          (organization) => organization.id === selectedOrganizationId,
        )?.name ?? user?.orgName ?? "Organisasi";

  const organizationOptions = accessibleOrganizations.map((organization) => (
    <DropdownMenuRadioItem
      key={organization.id}
      value={organization.id}
      className="max-w-full"
    >
      <span className="min-w-0 truncate" title={organization.name}>
        {organization.name}
      </span>
    </DropdownMenuRadioItem>
  ));

  return (
    <header
      data-slot="app-topbar"
      className="fixed inset-x-0 top-0 z-50 isolate flex h-14 w-full shrink-0 self-start bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex min-w-0 flex-1">
        <div className="hidden h-full shrink-0 items-center border-e border-border/60 px-2 transition-[width] duration-200 ease-(--ease-out) motion-reduce:transition-none md:flex md:w-(--sidebar-width) md:group-data-[state=collapsed]/sidebar-wrapper:w-(--sidebar-width-icon) md:group-data-[state=collapsed]/sidebar-wrapper:justify-center">
          <Link
            href="/overview"
            className="flex min-w-0 items-center rounded-md px-2 py-1 text-sm font-bold uppercase tracking-[2px] text-foreground outline-hidden transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring md:group-data-[state=collapsed]/sidebar-wrapper:hidden"
          >
            <span className="min-w-0 truncate">MANRIS</span>
          </Link>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border/60 px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-1">
            <SidebarTrigger className="md:hidden" />
            <Link
              href="/overview"
              className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm font-bold uppercase tracking-[2px] text-foreground outline-hidden transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <span className="truncate">MANRIS</span>
            </Link>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Pilih organisasi. Saat ini ${selectedOrganizationName}`}
                  className="hidden min-w-0 max-w-72 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground outline-hidden transition-colors duration-150 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
                >
                  <span className="min-w-0 truncate" title={selectedOrganizationName}>
                    {selectedOrganizationName}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>Organisasi sesuai hak akses</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizationsLoading ? (
                  <DropdownMenuItem disabled>Memuat organisasi...</DropdownMenuItem>
                ) : organizationsError ? (
                  <DropdownMenuItem disabled>
                    Organisasi belum berhasil dimuat.
                  </DropdownMenuItem>
                ) : accessibleOrganizations.length === 0 ? (
                  <DropdownMenuItem disabled>
                    Tidak ada organisasi yang dapat diakses.
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuRadioGroup
                    value={selectedOrganizationId}
                    onValueChange={setSelectedOrganizationId}
                  >
                    {user?.isGlobal ? (
                      <DropdownMenuRadioItem value={ALL_ORGANIZATIONS_VALUE}>
                        Semua Organisasi
                      </DropdownMenuRadioItem>
                    ) : null}
                    {organizationOptions}
                  </DropdownMenuRadioGroup>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h1 className="truncate text-center text-sm font-medium text-foreground">
            {pageTitle}
          </h1>

          <div aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
