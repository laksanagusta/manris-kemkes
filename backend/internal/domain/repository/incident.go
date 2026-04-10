package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// IncidentRepository defines the interface for incident data access
type IncidentRepository interface {
	Create(ctx context.Context, incident *entity.Incident) error
	GetByID(ctx context.Context, id string, orgIDs []uuid.UUID) (*entity.Incident, error)
	Update(ctx context.Context, incident *entity.Incident) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error)
	GetSummary(ctx context.Context, orgIDs []uuid.UUID) (map[string]interface{}, error)
}
