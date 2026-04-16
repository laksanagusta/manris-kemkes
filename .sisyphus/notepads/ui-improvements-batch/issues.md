## Issues Log

### F3 QA: No issues found (2026-04-15)
- All 13 scenarios passed visual QA
- 5/5 integration checks passed (0 JS errors)
- 3 edge cases tested (XSS, empty search, collapsible toggle) — all passed
- **No blocking or critical issues discovered**

### Minor observations (non-blocking)
- Inbox search uses `?search=` vs `?q=` used elsewhere — inconsistent but functional
- Recharts console warnings (6) on chart pages — standard library behavior
