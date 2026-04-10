package incident

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// CreateIncidentBatchUseCase handles batch creation of incidents with partial success.
type CreateIncidentBatchUseCase struct {
	createUC *CreateIncidentUseCase
}

func NewCreateIncidentBatchUseCase(createUC *CreateIncidentUseCase) *CreateIncidentBatchUseCase {
	return &CreateIncidentBatchUseCase{
		createUC: createUC,
	}
}

type CreateIncidentBatchItemInput struct {
	ClientKey        string
	Title            string
	What             string
	Who              string
	When             *time.Time
	Where            string
	WhyHow           string
	Severity         string
	CorrectiveAction string
	PreventiveAction string
	LinkedRiskIDs    []string
	OrganizationID   *uuid.UUID
}

type CreateIncidentBatchInput struct {
	Items      []CreateIncidentBatchItemInput
	ReporterID *uuid.UUID
	OrgIDs     []uuid.UUID
}

type CreateIncidentBatchItemOutput struct {
	ClientKey string     `json:"clientKey"`
	ID        *uuid.UUID `json:"id,omitempty"`
	Code      *string    `json:"code,omitempty"`
	Status    string     `json:"status"`
	Message   string     `json:"message"`
	Error     string     `json:"error,omitempty"`
}

type CreateIncidentBatchOutput struct {
	Items []CreateIncidentBatchItemOutput `json:"items"`
}

func (uc *CreateIncidentBatchUseCase) Execute(ctx context.Context, input CreateIncidentBatchInput) (*CreateIncidentBatchOutput, error) {
	output := &CreateIncidentBatchOutput{
		Items: make([]CreateIncidentBatchItemOutput, 0, len(input.Items)),
	}

	for _, item := range input.Items {
		result, err := uc.createUC.Execute(ctx, CreateIncidentInput{
			Title:            item.Title,
			What:             item.What,
			Who:              item.Who,
			When:             item.When,
			Where:            item.Where,
			WhyHow:           item.WhyHow,
			Severity:         item.Severity,
			CorrectiveAction: item.CorrectiveAction,
			PreventiveAction: item.PreventiveAction,
			LinkedRiskIDs:    item.LinkedRiskIDs,
			ReporterID:       input.ReporterID,
			OrganizationID:   item.OrganizationID,
			OrgIDs:           input.OrgIDs,
		})
		if err != nil {
			output.Items = append(output.Items, CreateIncidentBatchItemOutput{
				ClientKey: item.ClientKey,
				Status:    "failed",
				Message:   "Incident failed to create",
				Error:     err.Error(),
			})
			continue
		}

		output.Items = append(output.Items, CreateIncidentBatchItemOutput{
			ClientKey: item.ClientKey,
			ID:        &result.ID,
			Code:      result.Code,
			Status:    "created",
			Message:   result.Message,
		})
	}

	return output, nil
}
