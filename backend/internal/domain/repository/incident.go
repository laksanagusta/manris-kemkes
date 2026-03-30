package repository

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

// IncidentRepository defines the interface for incident data access
type IncidentRepository interface {
	Create(ctx context.Context, incident *entity.Incident) error
	GetByID(ctx context.Context, id string) (*entity.Incident, error)
	Update(ctx context.Context, incident *entity.Incident) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filters map[string]string) ([]*entity.Incident, error)
	GetSummary(ctx context.Context, orgID string) (map[string]interface{}, error)
}
