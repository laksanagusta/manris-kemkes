"use client";

import { PageStack, TooltipProvider } from "@/components/shared/design-system";
import {
  AccordionExample,
  AiSuggestionDropdownExample,
  ArchivedBannerExample,
  BadgeSystemExample,
  ButtonVariantsExample,
  ActionButtonsExample,
  CardPatternsExample,
  CollectionLayoutExample,
  CollectionPageHeaderExample,
  ColorPaletteExample,
  DesignSystemSectionLabel,
  DialogExample,
  DropdownActionMenuExample,
  FilterPopoverExample,
  FieldsExample,
  FormDialogExample,
  FormContainerExample,
  InlineEmptyStateExample,
  IconographyExample,
  MitigationProgressDialogExample,
  MitigationProgressFormExample,
  MonitoringTransactionProgressExample,
  OverviewDashboardExample,
  OverviewPanelStatesExample,
  PageHeaderExample,
  PaginationExample,
  ProgressMeterExample,
  RadiusScaleExample,
  ReportPrimitivesExample,
  RiskAssessmentSummaryExample,
  RiskSummaryStripExample,
  SearchInputExample,
  SemesterIndicatorExample,
  SidebarMotionExample,
  TableExample,
  TabsExample,
  TooltipExample,
  TypographyExample,
  VersionTimelineExample,
} from "@/components/shared/design-system/examples";

export default function DesignSystemPage() {
  return (
    <TooltipProvider>
      <PageStack className="space-y-12">
        <PageHeaderExample />

        <section className="space-y-4">
          <DesignSystemSectionLabel>Color Palette</DesignSystemSectionLabel>
          <ColorPaletteExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Typography</DesignSystemSectionLabel>
          <TypographyExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Iconography</DesignSystemSectionLabel>
          <IconographyExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Sidebar Motion</DesignSystemSectionLabel>
          <SidebarMotionExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Border Radius Scale</DesignSystemSectionLabel>
          <RadiusScaleExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Form Fields</DesignSystemSectionLabel>
          <FieldsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Button Variants</DesignSystemSectionLabel>
          <ButtonVariantsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Shared Action Buttons</DesignSystemSectionLabel>
          <ActionButtonsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Badge System</DesignSystemSectionLabel>
          <BadgeSystemExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Card Patterns</DesignSystemSectionLabel>
          <CardPatternsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>
            Page & Collection / Intelligence Layout
          </DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Register, Meeting, dan Document Intelligence memakai shell koleksi
            yang sama: toolbar di luar card data, surface netral, dan state
            loading/empty yang konsisten.
          </p>
          <CollectionLayoutExample />
          <CollectionPageHeaderExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Report Primitives</DesignSystemSectionLabel>
          <ReportPrimitivesExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Overview Dashboard</DesignSystemSectionLabel>
          <OverviewDashboardExample />
          <RiskSummaryStripExample />
          <OverviewPanelStatesExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Accordion (Risk Form Sections)</DesignSystemSectionLabel>
          <AccordionExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Tabs</DesignSystemSectionLabel>
          <TabsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Table</DesignSystemSectionLabel>
          <TableExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Pagination</DesignSystemSectionLabel>
          <PaginationExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Filter Popover</DesignSystemSectionLabel>
          <FilterPopoverExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Dialog / AlertDialog</DesignSystemSectionLabel>
          <DialogExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Form Dialog</DesignSystemSectionLabel>
          <FormDialogExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Mitigation Progress Dialog</DesignSystemSectionLabel>
          <MitigationProgressDialogExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Mitigation Progress Form</DesignSystemSectionLabel>
          <MitigationProgressFormExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Risk Assessment Summary Strip</DesignSystemSectionLabel>
          <RiskAssessmentSummaryExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Semester Indicator</DesignSystemSectionLabel>
          <SemesterIndicatorExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>
            Monitoring Transaction Progress
          </DesignSystemSectionLabel>
          <MonitoringTransactionProgressExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Dropdown Menu</DesignSystemSectionLabel>
          <DropdownActionMenuExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Progress Bar (Completeness)</DesignSystemSectionLabel>
          <ProgressMeterExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Tooltip</DesignSystemSectionLabel>
          <TooltipExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Collection Search</DesignSystemSectionLabel>
          <SearchInputExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Archived Banner</DesignSystemSectionLabel>
          <ArchivedBannerExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>AI Suggestion Dropdown</DesignSystemSectionLabel>
          <AiSuggestionDropdownExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Timeline / Version Selector</DesignSystemSectionLabel>
          <VersionTimelineExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Empty / Disabled State</DesignSystemSectionLabel>
          <InlineEmptyStateExample message="Simpan draft untuk mengakses navigasi" />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Form Page Container</DesignSystemSectionLabel>
          <FormContainerExample />
        </section>
      </PageStack>
    </TooltipProvider>
  );
}
