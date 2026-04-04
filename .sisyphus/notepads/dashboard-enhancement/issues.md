# Issues — dashboard-enhancement

## [2026-04-04] Known Gotchas

### Schema Gaps Resolved in Plan
- `mitigations` lacks `completed_at` → Use `due_date` + `status` for overdue detection
- `incidents` lacks `resolved_at` → Use `approval_requests.requested_at` → `approval_histories.created_at` for response time
- Unit Response Time also uses `mitigation_tasks.created_at` → `reported_at` (where status='done')

### Architecture Gotcha
- `RiskHandler` already has 12+ constructor params — when adding new use cases in Tasks 4-7, must add to existing constructor, not create new handler structs
- Comment: `// TODO: extract DashboardHandler` per plan guidance

### Frontend Gotcha  
- Overview page is 600+ lines — careful edits needed, don't accidentally remove existing sections
- Heatmap extraction (Task 3) must preserve PIXEL-PERFECT visual parity
- Task 11 (velocity overlay) depends on Task 3 output — the extracted `risk-heatmap.tsx` file

### Dependency Notes
- Task 11 blocked by BOTH Task 3 AND Task 4 (needs extracted component + velocity endpoint)
- Task 12 blocked by BOTH Task 2 AND Tasks 5, 6, 7 (all 4 deps)
- Wave 3 cannot start until ALL of Wave 1 AND Wave 2 are complete
