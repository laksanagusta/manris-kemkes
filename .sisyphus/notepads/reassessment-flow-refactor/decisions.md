## Decisions
- 2-step approval preserved internally via approval_steps table
- Assessment form route `/risk/assessment/[id]` kept, only list page removed
- Redirect `/risk/assessment` → `/risk/register` via next.config.ts
- TDD: update tests first, then implementation
- Status mapping: draft→assessment_draft, in_review+in_approval→assessment_in_review, rejected→assessment_draft, approved stays
