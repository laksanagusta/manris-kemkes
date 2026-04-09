# Risk Reviewer vs Approval Step Semantics - Completion Notes

## Date Completed
2026-04-08

## Implementation Summary

### Backend Changes
1. **Database Migration** (000030_approval_steps_add_step_type):
   - Added `step_type VARCHAR(20) NOT NULL DEFAULT 'approval'` column
   - Backfills existing reviewer rows based on user role

2. **Domain Layer**:
   - `ApprovalStep` entity: Added `StepType string` field
   - `ApprovalLineMember` struct: Added `Type string` field with JSON omitempty

3. **Repository Layer** (approval.go):
   - `CreateSteps()`: Now inserts `step_type`
   - `GetSteps()`: Now selects `step_type`
   - `ApproveCurrentStep()`: Now hydrates `StepType` for current and next steps

4. **Usecase Layer**:
   - `submit.go`: Added `SubmissionType` field ('review' | 'approval'), creates steps with appropriate type
   - `action.go`: Status transitions now use `currentStep.StepType` instead of `input.ActorRole`
   - `get_detail.go`: StepOutput now includes `stepType` field

5. **Tests Added**:
   - `TestSubmitApprovalUseCase_ReviewSubmission_CreatesReviewStepType`
   - `TestSubmitApprovalUseCase_ApprovalOnlySubmission_CreatesApprovalStepTypes`
   - `TestSubmitApprovalUseCase_EmptySubmissionType_DefaultsToApproval`

### Frontend Changes
1. **Helper Functions** (risk-approval-line.ts):
   - Added `StepType` export type ('review' | 'approval')
   - Updated `ApprovalLineMember` to include optional `type` field
   - Updated `buildDraftApprovalLine()` to return typed members
   - Added new `buildTypedSubmitMembers()` function for explicit typed submissions

2. **UI Layer** (page.tsx):
   - Updated draft loading to use `type === 'review'` instead of positional index
   - Updated approval steps loading to filter by `stepType`
   - Updated submission to use `buildTypedSubmitMembers()` and pass `submissionType`

3. **Tests Added**:
   - Updated existing tests to expect typed output
   - Added `buildTypedSubmitMembers` test for review submission
   - Added `buildTypedSubmitMembers` test for approval-only submission

## Verification Results

### Backend Tests
```
TestApprovalActionUseCase_ApproveReassessmentActivatesNewCurrentVersion - PASS
TestApprovalActionUseCase_ReturnsErrorWhenRiskStatusUpdateFails - PASS
TestApprovalActionUseCase_ReviewerApproves_SetsStatusToInApproval - PASS
TestApprovalActionUseCase_PimpinanApproves_SetsStatusToApproved - PASS
TestApprovalActionUseCase_RejectFromInReview_SetsStatusToDraft - PASS
TestApprovalActionUseCase_RejectFromInApproval_SetsStatusToDraft - PASS
TestSubmitApprovalUseCase_UnitSubmissionTargetsReviewer - PASS
TestSubmitApprovalUseCase_SubmitDraftRisk_UpdatesStatusToInReview - PASS
TestSubmitApprovalUseCase_ReviewSubmission_CreatesReviewStepType - PASS
TestSubmitApprovalUseCase_ApprovalOnlySubmission_CreatesApprovalStepTypes - PASS
TestSubmitApprovalUseCase_EmptySubmissionType_DefaultsToApproval - PASS
```

### Frontend Tests
```
buildDraftApprovalLine keeps reviewer first and appends approvers - PASS
buildDraftApprovalLine includes currently selected approver before explicit add - PASS
buildSubmitApproverIds creates reviewer to approver chain without duplicates - PASS
buildTypedSubmitMembers creates review submission with typed members - PASS
buildTypedSubmitMembers creates approval-only submission without reviewer - PASS
```

### Build Status
- Backend: Compiles successfully, all approval tests pass
- Frontend: Build successful, no TypeScript errors

## Key Design Decisions

1. **Backward Compatibility**: Existing data without `type` field defaults to `'approval'`
2. **Explicit Over Implicit**: Status transitions now use `StepType` rather than inferring from `ActorRole`
3. **API Contract**: Added `submissionType` field to approval submit endpoint ('review' | 'approval')
4. **Separation of Concerns**: Reviewer and approvers are now semantically distinct throughout the stack

## Migration Status
- Migration applied successfully using IPv4 DB URL:
  - `migrate -path db/migrations -database postgres://postgres:4msterdam@127.0.0.1:5439/manris?sslmode=disable up`

## Manual Verification Findings (API-only)

### Workflow evidence
- Save draft / reopen verification:
  - risk reset to `draft`
  - `draftApprovalLine` round-tripped as:
    - reviewer: `type=review`
    - approver: `type=approval`
- Submit for review verification:
  - `/approvals/by-entity` returned steps:
    - step 1: `stepType=review`, `approverRole=reviewer`
    - step 2: `stepType=approval`, `approverRole=pimpinan`
- Reject from review verification:
  - reviewer reject moved risk status to `draft`
- Reviewer approve verification:
  - reviewer approve moved risk status to `in_approval`
- Reject from approval verification:
  - pimpinan reject moved risk status to `draft`
- Pimpinan approve verification:
  - after reviewer approval, pimpinan approval moved risk status to `approved`

### Additional bugs discovered during manual verification
1. `/approvals/by-entity` initially omitted `stepType`
   - root cause: `backend/internal/usecase/approval/get_by_entity.go` did not map `step.StepType` into `StepOutput`
   - fix: map `StepType` and add regression test `TestGetApprovalByEntityUseCase_MapsStepType`

2. Reviewer approval with a next approval step initially kept risk in `in_review`
   - root cause: `backend/internal/usecase/approval/action.go` only updated entity status when `nextStep == nil`
   - fix: when approving a `review` step and `nextStep != nil`, update risk status to `in_approval` while keeping approval request pending
   - regression test added: `TestApprovalActionUseCase_ReviewerApproves_WithNextApprovalStep_SetsStatusToInApproval`

## Remaining Blockers Before True Plan Closure
- Technical verification blockers are cleared.
- Remaining non-technical gate from the plan: user acknowledgement (`"okay"`) after reviewing verification evidence.

## Current Session State
- User sign-off received: `okay`.
- Plan can now be marked complete in `.sisyphus/boulder.json`.
- No further implementation or verification work remains.

## Files Modified
- backend/db/migrations/000030_approval_steps_add_step_type.up.sql
- backend/db/migrations/000030_approval_steps_add_step_type.down.sql
- backend/internal/domain/entity/approval.go
- backend/internal/domain/entity/risk.go
- backend/internal/repository/postgres/approval.go
- backend/internal/usecase/approval/submit.go
- backend/internal/usecase/approval/action.go
- backend/internal/usecase/approval/get_detail.go
- backend/internal/usecase/approval/submit_test.go
- backend/internal/usecase/approval/action_test.go
- frontend/src/lib/risk-approval-line.ts
- frontend/src/lib/risk-approval-line.test.ts
- frontend/src/app/(app)/risk/register/new/page.tsx
