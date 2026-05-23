# Cross-Unit Risk Access Policy Design

Date: 2026-05-23
Status: Proposed

## Summary

Non-superadmin users must not browse cross-unit operational risk data by default.
`unit`, `reviewer`, and `pimpinan` are treated the same for read access across operational pages:

- They can manage and browse only their own unit's operational records.
- They can access cross-unit data only through report surfaces.
- Cross-unit report access requires explicit unit selection by the user.

This design keeps operational workspaces scoped to the owning unit while preserving supervisory visibility through controlled reporting flows.

## Problem

The current access model inherits descendant organizations into the authenticated user's readable scope. This is useful for hierarchical supervision, but it makes operational pages behave like cross-unit browsing surfaces. That creates three product risks:

- Operational clutter for parent units because list pages can become a mixed workspace across descendants.
- Weak boundary between supervision and execution, especially for reviewer and pimpinan roles.
- Broader exposure of detailed risk records than is needed for day-to-day monitoring.

## Goals

- Keep operational pages focused on the owning unit.
- Preserve supervisory visibility through reports and exports.
- Require deliberate user intent before showing cross-unit data.
- Keep approval and escalation workflows functional without reopening broad browse access.

## Non-Goals

- Changing superadmin global access.
- Removing workflow-based access to records assigned through approval or escalation.
- Reworking organizational hierarchy or descendant resolution itself.

## Policy Decision

### 1. Role Treatment

`unit`, `reviewer`, and `pimpinan` use the same cross-unit access policy:

- No cross-unit browsing on operational pages.
- Cross-unit read access is allowed only on approved reporting surfaces.
- `superadmin` remains globally readable and writable according to existing rules.

### 2. Operational Surfaces

The following pages and APIs should default to own-unit-only access for non-superadmin users:

- Dashboard and operational summary pages
- Risk register list
- Risk detail opened from normal navigation
- Working papers
- Mitigation handling and monitoring
- Other list or detail pages that function as unit workspaces rather than reporting views

For these surfaces, descendant organizations must not be auto-included for browse/read behavior.

### 3. Reporting Surfaces

Cross-unit read access is allowed only on report-oriented pages such as:

- `/reports`
- Report exports
- Report PDF generation
- Other explicitly designated analysis/report pages

For non-superadmin users:

- The page must require explicit unit selection before cross-unit data is shown.
- Default state should not auto-load all descendant units.
- Export output must follow the selected report filter exactly.

### 4. Workflow Exceptions

Non-superadmin users may still access records outside their own unit when the record is reached through an official workflow path, such as:

- Approval inbox assignment
- Escalation assignment
- System-generated deep link tied to a task the user must act on

This exception allows task completion on a specific record only. It does not grant general list or browse access to the source unit.

## Access Matrix

### Superadmin

- Operational pages: all units
- Reports: all units
- Exports: all units

### Unit

- Operational pages: own unit only
- Reports: own unit by default, cross-unit only when explicitly allowed by hierarchy and selected in report filters
- Workflow exception: allowed for assigned items only

### Reviewer

- Operational pages: own unit only
- Reports: same policy as unit
- Workflow exception: allowed for assigned review items only

### Pimpinan

- Operational pages: own unit only
- Reports: same policy as unit
- Workflow exception: allowed for assigned approval items only

## UX Rules

### Report Page Default State

For non-superadmin users with descendant visibility:

- Show an empty or instructional state until a unit is selected.
- Recommended copy: `Pilih unit untuk melihat laporan.`

### Report Filters

Initial recommendation:

- Start with single-select unit filter for simplicity and tighter control.
- Add multi-select later only if a real reporting need emerges.

### Navigation Intent

- Operational navigation should feel like "my unit workspace".
- Report navigation should feel like "supervision and analysis".

## Backend Guidance

The current access scope model can still keep descendant awareness, but operational handlers must not automatically use descendant org IDs for browse endpoints.

Recommended rule:

- Operational endpoints for non-superadmin users use own organization ID by default.
- Report endpoints may accept narrowed descendant org filters after authorization checks.
- Workflow endpoints may validate access through task ownership rather than broad organization browse access.

## Frontend Guidance

- Hide or disable cross-unit browsing affordances on operational pages for non-superadmin users.
- Keep unit filters for report pages only.
- Ensure report export actions mirror the active selected unit filter.
- If a user opens a cross-unit item through workflow, present it as a task-specific exception, not as a general workspace switch.

## Testing Guidance

- Confirm non-superadmin users cannot list descendant-unit risks from operational pages.
- Confirm non-superadmin users can generate reports for an explicitly selected descendant unit when authorized.
- Confirm report pages do not auto-load all descendant data.
- Confirm approval and escalation links still open the assigned record.
- Confirm superadmin behavior remains unchanged.

## Open Implementation Note

The current backend behavior appears to include descendant organizations in general readable scope. Implementation should separate:

- `read for operational browsing`
- `read for reporting`
- `read for assigned workflow tasks`

This separation should be explicit in both API policy and frontend behavior so the product model stays understandable over time.
