# Draft: Review Workflow Pemantauan Risiko

## Scope
- FROM: Risk Register form (`/risk/register/new`)
- TO: Monitoring/Pemantauan (`/compliance/monitoring`, `/risk/assessment`)
- Focus: Workflow logic + UI/UX intuitiveness

## Current State Analysis

### Navigation Structure (Sidebar)
1. **Risk Register** → `/risk/register`
2. **Pemantauan Risiko** → `/risk/assessment` (list approved risks, reassessment button)
3. **Monitoring & Updates** → `/compliance/monitoring` (3 tabs: Risk Review, Mitigasi, KRI)

### Key Finding: DUPLICATED REASSESSMENT WORKFLOW
- `/risk/assessment` page: Lists approved risks + "Nilai Ulang" button → creates reassessment draft
- `/compliance/monitoring` Risk Review tab: Lists review queue + "Reassessment" button → same action
- **Both do the same thing** — confusing for users

### Workflow Gaps Identified

1. **No explicit "monitoring" status** — approved risks are implicitly "monitored" when KRI/controls linked
2. **Disconnected KRI creation** — user must manually navigate to `/compliance/kri/new` after risk approved
3. **Tab "KRI" missing from TabsList** — monitoring-reporting-workspace.tsx line 86-101 only renders 2 tabs (Risk Review, Mitigasi), KRI tab is hidden from TabsList but TabsContent exists
4. **No guided post-approval flow** — after risk approved, user gets no prompt to create KRI/controls/mitigations
5. **Mitigation created during risk register** — but monitoring happens in separate page with no clear link back

### UI/UX Issues

1. **3 separate entry points** for essentially monitoring:
   - Pemantauan Risiko (sidebar)
   - Monitoring & Updates (sidebar)
   - Risk Register → version history
   
2. **No progress indicator** showing "this risk has X/Y monitoring setup complete"

3. **KRI tab invisible** in workspace despite having full implementation

4. **Form dialog for mitigation progress** is modal-only — can't see context while reporting

5. **No notification/reminder system** visible for overdue items

## Open Questions
- Is the `/risk/assessment` page intentionally separate from `/compliance/monitoring`?
- Should KRI creation be prompted automatically after risk approval?
