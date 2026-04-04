package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// FormListFilter constrains which forms are returned by List.
type FormListFilter struct {
	Status    *string
	CreatedBy *uuid.UUID
}

// FormRepository defines the data-access contract for forms and their structure.
type FormRepository interface {
	Create(ctx context.Context, form *entity.Form) (*entity.Form, error)
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Form, error)
	Update(ctx context.Context, form *entity.Form) (*entity.Form, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter FormListFilter) ([]*entity.Form, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, newStatus string) error
	HasResponses(ctx context.Context, formID uuid.UUID) (bool, error)
	GetResponseCount(ctx context.Context, formID uuid.UUID) (int, error)
}

// FormResponseRepository defines the data-access contract for form responses.
type FormResponseRepository interface {
	Create(ctx context.Context, response *entity.FormResponse) (*entity.FormResponse, error)
	GetByFormID(ctx context.Context, formID uuid.UUID) ([]*entity.FormResponse, error)
	GetByFormAndRespondent(ctx context.Context, formID uuid.UUID, respondentID uuid.UUID) (*entity.FormResponse, error)
	CountByFormID(ctx context.Context, formID uuid.UUID) (int, error)
	GetFieldAggregations(ctx context.Context, formID uuid.UUID, fields []entity.FormField) ([]entity.FormFieldAnalytics, error)
	GetFieldTrends(ctx context.Context, formID uuid.UUID, fields []entity.FormField, period string) ([]entity.FormFieldTrends, error)
}

// FormAssignmentRepository defines the data-access contract for form-to-organisation assignments.
type FormAssignmentRepository interface {
	SetAssignments(ctx context.Context, formID uuid.UUID, orgIDs []uuid.UUID) error
	GetByFormID(ctx context.Context, formID uuid.UUID) ([]*entity.FormAssignment, error)
	GetFormIDsForOrganization(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error)
}
