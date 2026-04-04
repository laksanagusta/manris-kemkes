## Issues

- TypeScript LSP diagnostics are unavailable in this environment because `typescript-language-server` is not installed.
- `npx tsc --noEmit` reports pre-existing unrelated test-file type errors in `frontend/src/lib/*.test.ts`, so it is not a clean repository-wide signal for this change.
