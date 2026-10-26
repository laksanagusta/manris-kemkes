# Agent response components implementation plan

**Goal:** Implement the three approved response components with real authorized data and contextual chat actions.

**Architecture:** Server tools construct typed immutable widget payloads. Canonical quarterly snapshots feed deterministic priority ranking and period comparisons. Production React components are reused in the design-system catalog; actions reuse the existing guarded chat submission and proposal flow.

**Tech Stack:** Go/Fiber, PostgreSQL, React/Next.js, existing Manris UI primitives.

Execution stays in the current checkout to preserve the existing uncommitted Agent feature. Work is sequential in this session.

- [x] Document visual rules in DESIGN.md and add illustrative catalog fixtures before feature rendering changes.
- [x] Add typed response contracts and tests for ranking, period measures, unknown values, and serialized snapshots.
- [x] Implement authorized detail, complete-population priorities, and comparison tools; guide automatic tool selection.
- [x] Add focused React renderers, direct contextual chat actions, responsive styles, and export support.
- [x] Run targeted backend tests, frontend lint/type/build checks, and review the final diff. Record any verification limitation honestly.

Validation: frontend build, production typecheck, targeted lint and 24 tests passed. Agent/runtime/tools/export tests passed; all domain-tool integration tests passed with race detection against the isolated test database. Priority and comparison tests cover pagination, ties, unknown scores, Jakarta boundaries, revoked/foreign access and no business writes. Browser verification remains unavailable because local browser access is disabled. The local backend was gracefully restarted with the new build and its health endpoint returned ok.

File map: agent/types.go and response_widgets.go own transport types; agenttools/response_components.go owns tool adapters; usecase/report/agent_priority.go owns ranking; components/agent/agent-response-*.tsx own display and catalog fixtures; service/agentreport owns snapshot export flattening. Existing reads, definitions, skills, AgentWidget, AgentScreen, DESIGN.md and the catalog connect these boundaries.
