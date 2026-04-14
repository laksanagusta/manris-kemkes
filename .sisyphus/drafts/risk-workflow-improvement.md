# Draft: Risk Assessment Workflow Improvement

## Requirements (confirmed)
- Priority: **Feature completeness first**, UX/UI after
- Align with international best practices (ISO 31000, COSO ERM)
- Improve risk assessment workflow: feature, UX, UI

## Current State Assessment

### Already Implemented (Strong Foundation)
- ✅ Multi-step risk creation form (5 steps)
- ✅ Bobot matrix scoring (probability × impact × weight, 5×5)
- ✅ Approval workflow (reviewer → approver, 2-stage)
- ✅ Reviewer assessment with separate P×I scoring + effectiveness labels
- ✅ Risk versioning & biannual cycle comparison (H1/H2)
- ✅ Mitigation tracking with task generation & overdue detection
- ✅ Dashboard: heatmap, KPI, velocity, KRI breaches, response times
- ✅ Working papers with multi-signatory digital signatures
- ✅ Bulk import from spreadsheet
- ✅ Communication log dialog
- ✅ Risk history timeline
- ✅ Audit trail

### Critical Gaps vs International Standards

| # | Gap | Severity | ISO 31000 | COSO ERM |
|---|-----|----------|-----------|----------|
| 1 | **Triple-layer scoring** (Inherent/Residual/Target) | 🔴 CRITICAL | Required | Required |
| 2 | **Risk Appetite Framework** (per-category, quantitative) | 🔴 CRITICAL | Required | Core component |
| 3 | **Control Effectiveness Tracking** (% effectiveness → residual calc) | 🔴 HIGH | Required for analysis | Required |
| 4 | **KRI Threshold Automation** (Green/Amber/Red + auto-escalate) | 🔴 HIGH | Monitoring & Review | Performance |
| 5 | **Risk Velocity** (speed of onset) | 🟡 MEDIUM | Optional enhancement | Recommended |
| 6 | **Cause-Event-Consequence Structure** | 🟡 MEDIUM | Recommended | — |
| 7 | **Approval Workflow Enhancement** (SLA, conditional routing, delegation) | 🟡 MEDIUM | — | Governance |
| 8 | **Treatment Effectiveness Measurement** (before/after tracking) | 🟡 MEDIUM | Required for monitoring | Required |
| 9 | **Structured Stakeholder Engagement** | 🟢 LOW | Communication & Consultation | Culture |

## Technical Decisions
- (pending user input)

## Open Questions
1. Which gaps to include in scope?
2. Backend-only vs full-stack changes?
3. Test strategy?
4. Migration strategy for existing data?

## Scope Boundaries
- INCLUDE: (pending)
- EXCLUDE: (pending)
