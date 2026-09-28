"use client";

import { useAuth } from "@/contexts/auth-context";
import { OrganizationGroupManagement } from "@/components/organization-group/organization-group-management";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

export default function SettingsGroupsPage() {
  const { token, user } = useAuth();

  return (
    <PageStack>
      <CollectionPageHeader title="Grup" />
      <OrganizationGroupManagement token={token ?? null} user={user} />
    </PageStack>
  );
}
