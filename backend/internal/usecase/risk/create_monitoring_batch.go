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

// CreateMonitoringBatchUseCase creates monitoring transactions for multiple risks
// as part of bulk monitoring (periodic review) submission.
type CreateMonitoringBatchUseCase struct {
	riskRepo       repository.RiskRepository
	monitoringRepo repository.RiskMonitoringRepository
	userRepo       repository.UserRepository
}

func NewCreateMonitoringBatchUseCase(
	riskRepo repository.RiskRepository,
	args ...any,
) *CreateMonitoringBatchUseCase {
	var monitoringRepo repository.RiskMonitoringRepository
	var userRepo repository.UserRepository
	for _, arg := range args {
		switch v := arg.(type) {
		case repository.RiskMonitoringRepository:
			monitoringRepo = v
		case repository.UserRepository:
			userRepo = v
		}
	}
	return &CreateMonitoringBatchUseCase{
		riskRepo:       riskRepo,
		monitoringRepo: monitoringRepo,
		userRepo:       userRepo,
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

func (uc *CreateMonitoringBatchUseCase) processItem(
	ctx context.Context,
	item BulkMonitoringBatchItemInput,
	cycle string,
	orgID uuid.UUID,
	createdBy *uuid.UUID,
	codeMap map[string]*entity.Risk,
	now time.Time,
) BulkMonitoringBatchItemOutput {
	if uc.monitoringRepo == nil {
		return uc.processLegacyItem(ctx, item, cycle, orgID, createdBy, codeMap, now)
	}

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
			Error:     "only current approved risks can be monitored",
		}
	}

	if existing, err := uc.monitoringRepo.GetByVersionGroupAndCycle(ctx, sourceRisk.VersionGroupID, cycle); err != nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "failed to check existing monitoring transactions",
			Error:     err.Error(),
		}
	} else if existing != nil {
		msg := "an in-progress monitoring transaction already exists for this cycle"
		if existing.Status == entity.RiskMonitoringStatusFinalized {
			msg = "monitoring transaction already finalized for this cycle"
		}
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			ID:        &existing.ID,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   msg,
			Error:     fmt.Sprintf("existing monitoring transaction %s for cycle %s", existing.ID, cycle),
		}
	}

	monitoring := entity.NewRiskMonitoringDraft(sourceRisk, cycle, *createdBy)
	monitoring.StartedAt = now
	monitoring.ObservedProbability = item.RealisasiP
	monitoring.ObservedImpact = item.RealisasiD
	monitoring.CalculateObservedScore()
	monitoring.SourceRisk = sourceRisk

	if err := uc.monitoringRepo.Create(ctx, monitoring); err != nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "failed to create monitoring transaction",
			Error:     err.Error(),
		}
	}

	return BulkMonitoringBatchItemOutput{
		ClientKey: item.ClientKey,
		ID:        &monitoring.ID,
		Code:      &sourceRisk.Code,
		Status:    "created",
		Message:   "monitoring transaction created",
	}
}

func (uc *CreateMonitoringBatchUseCase) processLegacyItem(
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

	if err := validateNoNewerCycle(ctx, uc.riskRepo, sourceRisk.VersionGroupID, cycle); err != nil {
		return BulkMonitoringBatchItemOutput{
			ClientKey: item.ClientKey,
			Code:      &sourceRisk.Code,
			Status:    "failed",
			Message:   "cannot create reassessment for older cycle",
			Error:     err.Error(),
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
