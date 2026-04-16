## Decisions Log

### F3 QA: Version History Sheet trigger location (2026-04-15)
- **Discovery**: "Lihat riwayat →" button in `review-side-panel.tsx` navigates to Activity tab, NOT the Version History Sheet
- **Actual trigger**: Small ghost icon button (History icon) in the risk edit form header, only visible when `riskId` exists
- **Decision**: Both behaviors are correct — they serve different purposes

### F3 QA: Inbox search param differs from other pages (2026-04-15)
- Inbox uses `?search=` query param while Risk Register and Working Papers use `?q=`
- **Decision**: Acceptable — each page independently manages its search params. Not a bug, but could be standardized in a future pass

### F3 QA: Recharts warnings on Dashboard/Reports (2026-04-15)
- 6 Recharts-related console warnings on pages with charts
- **Decision**: Non-blocking, standard Recharts behavior. Not counted as JS errors
