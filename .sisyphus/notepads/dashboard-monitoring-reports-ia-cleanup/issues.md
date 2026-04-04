## 2026-04-03
- Repo-wide `npm run lint` currently fails due to pre-existing errors in unrelated frontend files; the updated workspace file itself lints cleanly.
- TypeScript LSP diagnostics were unavailable in this environment (`typescript-language-server` not installed), so file-level diagnostic verification could not be run here.
## 2026-04-03
- Full `npm run lint` still reports many pre-existing errors outside `src/components/app-sidebar.tsx`; the changed sidebar file itself passes `eslint` when checked directly.
## 2026-04-04 — F2: Code Quality Review
- `console.error()` usage in `overview/page.tsx` (9 calls) and `reports/page.tsx` (10 calls) within `Promise.allSettled` rejection handlers — acceptable existing project pattern but ideally should use a proper error reporting service.
- `fmt.Println(string(jsn))` found in `backend/internal/repository/openai/cba.go:49` — NOT in new/modified files, pre-existing.
- Missing `data-testid="velocity-arrow"` on velocity overlay icons (TrendingUp/TrendingDown/Minus) in `risk-heatmap.tsx` — minor gap in test attribute coverage.
