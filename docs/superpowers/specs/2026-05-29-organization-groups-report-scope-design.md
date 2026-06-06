# Organization Groups Report Scope Design

Date: 2026-05-29

## Summary

Add organization groups as owner-scoped reporting filters. A user in an organization, for example UPR T1, can create a group such as "Jawa Timur" and choose multiple descendant organizations under that UPR. Reports can then be filtered by the group so results include only the selected member organizations.

Organization groups are not part of the legal organization hierarchy. They are reusable reporting scopes owned by one organization.

## Goals

- Let a unit user manage groups for their own organization.
- Let each group contain multiple descendant organizations.
- Allow overlapping membership between groups.
- Use group members only when filtering reports.
- Keep existing organization-based report filters working.
- Apply group filtering to report pages that already support organization filtering.

## Non-Goals

- Do not replace or restructure the existing organization hierarchy.
- Do not create virtual organization nodes.
- Do not add global/shared group ownership in the first implementation.
- Do not make group filters affect write permissions for operational data.
- Do not force each organization to belong to only one group.

## Domain Model

Create two tables:

```sql
organization_groups (
  id UUID PRIMARY KEY,
  owner_organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

organization_group_members (
  group_id UUID NOT NULL REFERENCES organization_groups(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, organization_id)
)
```

Constraints and indexes:

- `UNIQUE (owner_organization_id, lower(name))`, implemented through a suitable unique index, prevents duplicate group names within the same owner organization.
- Index `organization_groups(owner_organization_id)` for listing by owner.
- Index `organization_group_members(organization_id)` for membership lookup.
- A member organization may appear in more than one group.

Validation rules:

- `name` is required after trimming whitespace.
- `owner_organization_id` is required.
- Every member must be a descendant of `owner_organization_id`.
- The owner organization itself should not be accepted as a member. The agreed report behavior is "members only"; including the owner would make aggregation ambiguous.
- Empty groups may be saved. Reports for an empty group return empty results.

## Authorization

Organization groups are scoped per owner organization.

- Non-global users can create, update, delete, and list groups only for their own `organizationId`.
- Non-global users can only add members included in their `accessibleOrgIds`.
- Non-global users can only use report filters for groups owned by their own organization.
- Superadmin can read all groups and can use any group as a report filter.
- This feature does not expand `CanWrite`; descendant organizations remain read-only unless existing permissions say otherwise.

## Backend API

Add protected endpoints:

```text
GET    /api/v1/organization-groups?owner_organization_id=&q=&page=&limit=
POST   /api/v1/organization-groups
GET    /api/v1/organization-groups/:id
PUT    /api/v1/organization-groups/:id
DELETE /api/v1/organization-groups/:id
```

Create and update payload:

```json
{
  "ownerOrganizationId": "uuid",
  "name": "Jawa Timur",
  "description": "Kelompok unit wilayah Jawa Timur",
  "memberOrganizationIds": ["uuid-kota-a", "uuid-kota-b"]
}
```

Response shape:

```json
{
  "id": "uuid",
  "ownerOrganizationId": "uuid-upr-t1",
  "ownerOrganizationName": "UPR T1",
  "name": "Jawa Timur",
  "description": "Kelompok unit wilayah Jawa Timur",
  "memberCount": 2,
  "members": [
    {
      "id": "uuid-kota-a",
      "name": "Kota A",
      "parentId": "uuid-upr-t1"
    }
  ],
  "createdAt": "2026-05-29T00:00:00Z",
  "updatedAt": "2026-05-29T00:00:00Z"
}
```

Repository behavior:

- Create/update group and members in a single transaction.
- Update replaces the member set.
- Delete cascades members through `ON DELETE CASCADE`.
- List returns member counts.
- Get returns full member details.

Usecase behavior:

- Normalize names by trimming whitespace before validation and persistence.
- Convert duplicate-name database errors to conflict errors.
- Validate descendant membership using the existing organization hierarchy service or equivalent repository method.
- Validate access with the current `AccessScope`.

Error mapping:

- `400 Bad Request`: invalid UUID, missing required field, member outside owner descendant, or ambiguous report filter combination.
- `403 Forbidden`: user attempts to manage or use a group outside their organization scope.
- `404 Not Found`: group does not exist.
- `409 Conflict`: duplicate group name under the same owner organization.

## Report Filtering

Add `organization_group_id` to every report endpoint that already accepts `org_id` or `organization_id`.

Rules:

- `organization_group_id` and `org_id` / `organization_id` are mutually exclusive.
- If both are present, return `400 Bad Request`.
- If `organization_group_id` is present, backend resolves it to member organization IDs and passes those IDs into existing report queries.
- Group filtering uses members only. It does not include the owner organization.
- Empty group resolves to an empty organization ID slice and returns empty report data. It must not widen scope to all organizations.
- Existing organization filters continue to work unchanged.

Implement a shared resolver near the existing report scope helpers:

```text
resolveReportScopeOrgIDs(scope, rawOrgID, rawOrganizationGroupID) -> []uuid.UUID
```

The resolver should:

- Preserve current global and non-global behavior when no group is provided.
- Validate group accessibility.
- Return member organization IDs only.
- Provide consistent error semantics for all report handlers.

Target report surfaces:

- Main reports page.
- Compliance monitoring report.
- Performance risk report.
- Risk cycle detail report.
- Evaluations and formal reports where organization filtering already exists.
- Dashboard/report analytics endpoints that currently resolve report organization IDs.

## Frontend UI

Update `Admin > Organizations` into a tabbed management page:

- `Struktur Organisasi`: current organization management table and dialogs.
- `Organization Groups`: new group management table and dialogs.

Organization Groups tab:

- Table columns: group name, owner organization, member count, description, created date, actions.
- Search by group name.
- Create/edit dialog:
  - Owner organization defaults to the current user's organization and is disabled for non-global users.
  - Name is required.
  - Description is optional.
  - Member picker supports multi-select from accessible descendant organizations.
  - Search members by name and location.
  - Selected members render as removable chips or compact rows.
- Delete dialog follows the existing organization delete confirmation pattern.

Report filter UI:

- Extend report organization filter to support two modes:
  - `Organisasi`
  - `Organization Group`
- In organization mode, send the existing `org_id` or `organization_id`.
- In group mode, send `organization_group_id`.
- Group options are limited to groups available to the current user.
- If the user has no groups, the organization filter remains usable.
- If a selected group has no members, show an empty-state explanation rather than implying a backend failure.

## Data Flow

1. A UPR T1 user opens `Admin > Organizations > Organization Groups`.
2. The frontend loads accessible organizations and groups owned by the user's organization.
3. The user creates "Jawa Timur" and selects descendant city/unit organizations.
4. The backend validates owner scope and descendant membership, then stores the group and members transactionally.
5. The user opens a report and selects filter mode `Organization Group`.
6. The frontend sends `organization_group_id`.
7. The backend resolves the group to member organization IDs.
8. Existing report query paths aggregate data for those member organizations only.

## Testing Plan

Backend usecase tests:

- Create rejects blank name.
- Create rejects duplicate group name under the same owner.
- Create rejects a member outside the owner descendant tree.
- Create allows overlapping members across two groups.
- Update replaces members transactionally.
- Non-global user cannot manage a group owned by another organization.
- Group resolver returns members only and excludes owner organization.
- Empty group resolves to empty scope and does not widen access.

Backend repository tests:

- CRUD persists group fields.
- Member replacement works in one transaction.
- List returns member counts.
- Get returns full member detail.
- Delete removes member rows through cascade.

Handler tests:

- `org_id` plus `organization_group_id` returns `400`.
- Invalid group ID returns `400`.
- Missing group returns `404`.
- Forbidden group returns `403`.
- Duplicate group name returns `409`.
- Existing org-only report filters keep current behavior.

Frontend tests:

- Admin group form requires a name.
- Member picker only shows accessible descendant organizations.
- Create/edit sends `memberOrganizationIds`.
- Report filter sends organization parameter in organization mode.
- Report filter sends `organization_group_id` in group mode.
- Report filter preserves existing organization-only behavior.

## Rollout

- Add schema migration for the new tables and indexes.
- Add backend entity, repository, usecases, handlers, and route registration.
- Add shared report scope resolver and update report handlers.
- Add frontend API client and types for organization groups.
- Add `Organization Groups` tab to admin organization management.
- Extend report filter components and report API calls.
- Run backend and frontend test suites relevant to organization, report scope, and changed report pages.

The rollout is additive. Existing data and report filters remain valid.
