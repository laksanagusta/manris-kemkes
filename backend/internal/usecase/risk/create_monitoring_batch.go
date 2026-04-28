package risk

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	apperrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateMonitoringBatchUseCase creates reassessment drafts for multiple risks
// as part of bulk monitoring (periodic review) submission.
type CreateMonitoringBatchUseCase struct {
	riskRepo repository.RiskRepository
	userRepo repository.UserRepository
}

func NewCreateMonitoringBatchUseCase(
	riskRepo repository.RiskRepository,
	userRepo repository.UserRepository,
) *CreateMonitoringBatchUseCase {
	return &CreateMonitoringBatchUseCase{
		riskRepo: riskRepo,
		userRepo: userRepo,
	}
}

// CreateMonitoringBatchInput is the input for batch monitoring creation.
type CreateMonitoringBatchInput struct {
	Items          []BulkMonitoringBatchItemInput
	Cycle          string
	OrganizationID uuid.UUID
	CreatedBy      *uuid.UUID
}

// Execute processes all items and creates reassessment drafts.
// For each valid item it:
//  1. Looks up the approved+current risk by Kode Risiko within the org scope
//  2. Re-validates it can be reassessed (approved + isCurrent)
//  3. Checks no existing draft for the cycle (FindInProgressReassessmentForCycle)
//  4. Calls BuildPeriodicReassessmentDraft to create a new draft
//  5. Updates draft Probability/Impact with RealisasiP/D values
//  6. Recomputes Weight using GetBobot
//  7. Persists the draft via riskRepo.Create
//
// Returns per-item results with created/failed status.
func (uc *CreateMonitoringBatchUseCase) Execute(ctx context.Context, input CreateMonitoringBatchInput) (*BulkMonitoringBatchOutput, error) {
	if !IsValidCycleFormat(input.Cycle) {
		return nil, apperrors.Wrap(apperrors.ErrInvalidInput, "assessment_cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}

	if input.CreatedBy == nil || *input.CreatedBy == uuid.Nil {
		return nil, apperrors.ErrInvalidInput
	}

	orgIDs := []uuid.UUID{input.OrganizationID}
	approvedRisks, err := uc.riskRepo.List(ctx, orgIDs, entity.RiskStatusApproved, "")
	if err != nil {
		return nil, apperrors.Wrap(err, "failed to load approved risks")
	}

	codeMap := make(map[string]*entity.Risk, len(approvedRisks))
	for _, r := range approvedRisks {
		if r.IsCurrent && r.Code != "" {
			codeMap[r.Code] = r
		}
	}

	now := time.Now().UTC()
	output := &BulkMonitoringBatchOutput{Items: make([]BulkMonitoringBatchItemOutput, 0, len(input.Items))}

	for _, item := range input.Items {
		result := uc.processItem(ctx, item, input.Cycle, input.OrganizationID, input.CreatedBy, codeMap, now)
		output.Items = append(output.Items, result)
	}

	return output, nil
}

// processItem handles a single batch item: lookup, validate, create draft, persist.
func (uc *CreateMonitoringBatchUseCase) processItem(
	ctx context.Context,
	item BulkMonitoringBatchItemInput,
	cycle string,
	orgID uuid.UUID,
	createdBy *uuid.UUID,
	codeMap map[string]*entity.Risk,
	now time.Time,
) BulkMonitoringBatchItemOutput {
	code := item.Code

	sourceRisk, ok := codeMap[code]
	if !ok {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &code,
			Status:    "failed",
			Message:   "risk not found or not approved+current",
			Error:     fmt.Sprintf("no approved current risk found with code %q", code),
		}
	}

	fullRisk, err := uc.riskRepo.GetByID(ctx, sourceRisk.ID, []uuid.UUID{orgID})
	if err != nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "failed to load full risk details",
			Error:     err.Error(),
		}
	}

	sourceRisk = fullRisk

	if !sourceRisk.CanBeReassessed() {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "risk cannot be reassessed",
			Error:     "only current approved risks can be reassessed",
		}
	}

	versions, err := uc.riskRepo.ListVersions(ctx, sourceRisk.VersionGroupID)
	if err != nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "failed to check existing drafts",
			Error:     err.Error(),
		}
	}

	if existing := FindInProgressReassessmentForCycle(versions, cycle); existing != nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			ID:        &existing.ID,
			Code:      &existing.Code,
			Status:    "failed",
			Message:   "an in-progress reassessment already exists for this cycle",
			Error:     fmt.Sprintf("existing draft %s for cycle %s", existing.ID, cycle),
		}
	}

	draft := BuildPeriodicReassessmentDraft(sourceRisk, cycle, now, *createdBy)

	draft.Probability = item.RealisasiP
	draft.Impact = item.RealisasiD
	draft.Weight = entity.GetBobot(item.RealisasiP, item.RealisasiD)
	draft.Nilai = entity.CalculateNilai(item.RealisasiP, item.RealisasiD, draft.Weight)
	draft.InherentScore = int(float64(item.RealisasiP) * float64(item.RealisasiD) * draft.Weight)

	if err := uc.riskRepo.Create(ctx, draft); err != nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "failed to create reassessment draft",
			Error:     err.Error(),
		}
	}

	return BulkMonitoringBatchItemOutput{
		ClientKey: item.ClientKey,
		ID:        &draft.ID,
		Code:      &draft.Code,
		Status:    "created",
		Message:   "reassessment draft created",
	}
}
