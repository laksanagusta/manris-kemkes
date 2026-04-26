package risk

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	apperrors "github.com/manris/backend/internal/domain/errors"
)

type CreateRiskBatchUseCase struct {
	createUC *CreateRiskUseCase
}

func NewCreateRiskBatchUseCase(createUC *CreateRiskUseCase) *CreateRiskBatchUseCase {
	return &CreateRiskBatchUseCase{createUC: createUC}
}

type CreateRiskBatchItemInput struct {
	ClientKey            string              `json:"clientKey"`
	Title                string              `json:"title"`
	Description          string              `json:"description"`
	Category             string              `json:"category"`
	OrganizationID       *uuid.UUID          `json:"organizationId,omitempty"`
	Cause                []string            `json:"cause"`
	RiskSource           string              `json:"riskSource"`
	Controllability      string              `json:"controllability"`
	ImpactDesc           []string            `json:"impactDesc"`
	ExistingControl      string              `json:"existingControl"`
	ControlEffectiveness string              `json:"controlEffectiveness"`
	Probability          int                 `json:"probability"`
	Impact               int                 `json:"impact"`
	Weight               float64             `json:"weight"`
	RiskPriority         int                 `json:"riskPriority"`
	RiskAppetite         string              `json:"riskAppetite"`
	TreatmentOption      string              `json:"treatmentOption"`
	Mitigations          []entity.Mitigation `json:"mitigations"`
	TargetProbability    int                 `json:"targetProbability"`
	TargetImpact         int                 `json:"targetImpact"`
	TargetWeight         float64             `json:"targetWeight"`
	RawExecutionSchedule string              `json:"rawExecutionSchedule,omitempty"`
}

type CreateRiskBatchInput struct {
	Items          []CreateRiskBatchItemInput `json:"items"`
	CreatedBy      *uuid.UUID                 `json:"createdBy,omitempty"`
	OrganizationID *uuid.UUID                 `json:"organizationId,omitempty"`
}

type CreateRiskBatchItemOutput struct {
	ClientKey string     `json:"clientKey"`
	ID        *uuid.UUID `json:"id,omitempty"`
	Code      *string    `json:"code,omitempty"`
	Status    string     `json:"status"`
	Message   string     `json:"message"`
	Error     string     `json:"error,omitempty"`
}

type CreateRiskBatchOutput struct {
	Items []CreateRiskBatchItemOutput `json:"items"`
}

func (uc *CreateRiskBatchUseCase) Execute(ctx context.Context, input CreateRiskBatchInput) (*CreateRiskBatchOutput, error) {
	output := &CreateRiskBatchOutput{Items: make([]CreateRiskBatchItemOutput, 0, len(input.Items))}

	for _, item := range input.Items {
		itemToCreate := item
		if itemToCreate.OrganizationID == nil && input.OrganizationID != nil {
			itemToCreate.OrganizationID = input.OrganizationID
		}
		normalized := normalizeBatchItem(itemToCreate)
		if err := validateBatchItem(normalized); err != nil {
			output.Items = append(output.Items, CreateRiskBatchItemOutput{
				ClientKey: item.ClientKey,
				Status:    "failed",
				Message:   "Risk failed to create",
				Error:     err.Error(),
			})
			continue
		}

		result, err := uc.createUC.Execute(ctx, CreateRiskInput{
			Title:                normalized.Title,
			Description:          normalized.Description,
			Category:             normalized.Category,
			OrganizationID:       normalized.OrganizationID,
			CreatedBy:            input.CreatedBy,
			Cause:                normalized.Cause,
			RiskSource:           normalized.RiskSource,
			Controllability:      normalized.Controllability,
			ImpactDesc:           normalized.ImpactDesc,
			ExistingControl:      normalized.ExistingControl,
			ControlEffectiveness: normalized.ControlEffectiveness,
			Probability:          normalized.Probability,
			Impact:               normalized.Impact,
			Weight:               normalized.Weight,
			RiskPriority:         normalized.RiskPriority,
			RiskAppetite:         normalized.RiskAppetite,
			TreatmentOption:      normalized.TreatmentOption,
			Mitigations:          normalized.Mitigations,
			TargetProbability:    normalized.TargetProbability,
			TargetImpact:         normalized.TargetImpact,
			TargetWeight:         normalized.TargetWeight,
		})
		if err != nil {
			output.Items = append(output.Items, CreateRiskBatchItemOutput{
				ClientKey: item.ClientKey,
				Status:    "failed",
				Message:   "Risk failed to create",
				Error:     err.Error(),
			})
			continue
		}

		output.Items = append(output.Items, CreateRiskBatchItemOutput{
			ClientKey: item.ClientKey,
			ID:        &result.ID,
			Code:      &result.Code,
			Status:    "created",
			Message:   result.Message,
		})
	}

	return output, nil
}

func normalizeBatchItem(item CreateRiskBatchItemInput) CreateRiskBatchItemInput {
	item.Title = strings.TrimSpace(item.Title)
	item.Description = strings.TrimSpace(item.Description)
	item.Category = strings.TrimSpace(item.Category)
	if item.Category == "" {
		item.Category = "operasional"
	}
	item.RiskSource = strings.TrimSpace(item.RiskSource)
	item.ExistingControl = strings.TrimSpace(item.ExistingControl)
	item.RiskAppetite = strings.TrimSpace(item.RiskAppetite)
	item.Controllability = normalizeControllability(item.Controllability)
	item.ControlEffectiveness = normalizeControlEffectiveness(item.ControlEffectiveness)
	item.TreatmentOption = normalizeTreatmentOption(item.TreatmentOption)
	for i := range item.Mitigations {
		item.Mitigations[i].Action = strings.TrimSpace(item.Mitigations[i].Action)
		item.Mitigations[i].Owner = strings.TrimSpace(item.Mitigations[i].Owner)
	}
	if item.Weight == 0 && item.Probability > 0 && item.Impact > 0 {
		item.Weight = entity.GetBobot(item.Probability, item.Impact)
	}
	if item.TargetWeight == 0 && item.TargetProbability > 0 && item.TargetImpact > 0 {
		item.TargetWeight = entity.GetBobot(item.TargetProbability, item.TargetImpact)
	}
	return item
}

func validateBatchItem(item CreateRiskBatchItemInput) error {
	if item.Title == "" {
		return apperrors.Wrap(apperrors.ErrInvalidTitle, "title is required")
	}
	if item.Category != "" {
		if !entity.IsValidRiskCategory(item.Category) {
			return apperrors.Wrap(apperrors.ErrInvalidRiskCategory, "invalid risk category")
		}
	}
	if item.Controllability != "" && item.Controllability != "C" && item.Controllability != "UC" {
		return apperrors.Wrap(apperrors.ErrInvalidInput, "controllability must be C or UC")
	}
	if item.Probability < 1 || item.Probability > 5 {
		return apperrors.ErrInvalidProbability
	}
	if item.Impact < 1 || item.Impact > 5 {
		return apperrors.ErrInvalidImpact
	}
	if item.TargetProbability < 1 || item.TargetProbability > 5 {
		return apperrors.ErrInvalidProbability
	}
	if item.TargetImpact < 1 || item.TargetImpact > 5 {
		return apperrors.ErrInvalidImpact
	}
	for _, mitigation := range item.Mitigations {
		if mitigation.Action == "" {
			return apperrors.Wrap(apperrors.ErrInvalidAction, "mitigation action is required")
		}
	}
	return nil
}
