
- 2026-04-26: `npx shadcn@latest docs card badge separator` hit an npm cache rename error (`ENOTEMPTY`) when run as a multi-component command. Retrying with narrower single-component commands worked.
- 2026-04-26: Post-change `npx tsc --noEmit` still fails on a pre-existing unrelated test fixture in `frontend/src/lib/risk-review-panel.test.ts` expecting incomplete `RiskReviewQueueItem` data. `npm run build` succeeds and includes `/panduan-risiko`.
