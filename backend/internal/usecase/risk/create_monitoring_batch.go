package risk

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	apperrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateMonitoringBatchUseCase creates monitoring transactions for multiple risks
// as part of bulk monitoring (periodic review) submission.
type CreateMonitoringBatchUseCase struct {
	riskRepo repository.RiskRepository
	starter  interface {
		Execute(context.Context, StartMonitoringInput) (*StartMonitoringOutput, error)
	}
}

func NewCreateMonitoringBatchUseCase(
	riskRepo repository.RiskRepository,
	starter interface {
		Execute(context.Context, StartMonitoringInput) (*StartMonitoringOutput, error)
	},
) *CreateMonitoringBatchUseCase {
	return &CreateMonitoringBatchUseCase{
		riskRepo: riskRepo,
		starter:  starter,
	}
}

// CreateMonitoringBatchInput is the input for batch monitoring creation.
type CreateMonitoringBatchInput struct {
	Items          []BulkMonitoringBatchItemInput
	Cycle          string
	OrganizationID uuid.UUID
	CreatedBy      *uuid.UUID
}

// Execute processes all items and creates monitoring transactions.
func (uc *CreateMonitoringBatchUseCase) Execute(ctx context.Context, input CreateMonitoringBatchInput) (*BulkMonitoringBatchOutput, error) {
	if !IsValidCycleFormat(input.Cycle) {
		return nil, apperrors.Wrap(apperrors.ErrInvalidInput, "assessment_cycle must be in YYYY-QN format (e.g. 2026-Q1)")
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

	output := &BulkMonitoringBatchOutput{Items: make([]BulkMonitoringBatchItemOutput, 0, len(input.Items))}

	for _, item := range input.Items {
		result := uc.processItem(ctx, item, input.Cycle, input.OrganizationID, input.CreatedBy, codeMap)
		output.Items = append(output.Items, result)
	}

	return output, nil
}

func (uc *CreateMonitoringBatchUseCase) processItem(
	ctx context.Context,
	item BulkMonitoringBatchItemInput,
	cycle string,
	orgID uuid.UUID,
	createdBy *uuid.UUID,
	codeMap map[string]*entity.Risk,
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

	if uc.starter == nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "monitoring flow is not configured",
			Error:     "canonical monitoring starter is required",
		}
	}

	result, err := uc.starter.Execute(ctx, StartMonitoringInput{
		SourceRiskID:        sourceRisk.ID,
		Cycle:               cycle,
		OrgIDs:              []uuid.UUID{orgID},
		StartedBy:           *createdBy,
		ObservedProbability: item.RealisasiP,
		ObservedImpact:      item.RealisasiD,
	})
	if err != nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "failed to start monitoring transaction",
			Error:     err.Error(),
		}
	}
	if result == nil || result.Monitoring == nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "monitoring flow returned an empty transaction",
			Error:     "canonical monitoring starter returned no monitoring",
		}
	}
	if result.ExistingDraft {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			ID:        &result.Monitoring.ID,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "an in-progress monitoring transaction already exists for this cycle",
			Error:     fmt.Sprintf("existing monitoring transaction %s for cycle %s", result.Monitoring.ID, cycle),
		}
	}

	return BulkMonitoringBatchItemOutput{
		ClientKey: item.ClientKey,
		ID:        &result.Monitoring.ID,
		Code:      &sourceRisk.Code,
		Status:    "created",
		Message:   "monitoring transaction created",
	}
}
