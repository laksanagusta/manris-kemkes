"use client";

import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTabsList } from "@/components/shared/design-system";

export function TabsExample() {
  return (
    <Tabs defaultValue="overview" className="w-[400px] gap-0.5">
      <SidebarTabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </SidebarTabsList>
      <TabsContent value="overview">
        <div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
          You have 12 active projects and 3 pending tasks.
        </div>
      </TabsContent>
      <TabsContent value="analytics">
        <div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
          Page views are up 25% compared to last month.
        </div>
      </TabsContent>
      <TabsContent value="reports">
        <div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
          You have 5 reports ready and available to export.
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
          Configure notifications, security, and themes.
        </div>
      </TabsContent>
    </Tabs>
  );
}
