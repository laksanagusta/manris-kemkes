package incident

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

func parseLinkedRiskIDs(linkedRiskIDs []string) ([]uuid.UUID, error) {
	seen := make(map[uuid.UUID]struct{}, len(linkedRiskIDs))
	parsed := make([]uuid.UUID, 0, len(linkedRiskIDs))

	for _, rawID := range linkedRiskIDs {
		if rawID == "" {
			continue
		}

		riskID, err := uuid.Parse(rawID)
		if err != nil {
			return nil, errors.ErrInvalidInput
		}
		if _, ok := seen[riskID]; ok {
			continue
		}

		seen[riskID] = struct{}{}
		parsed = append(parsed, riskID)
	}

	return parsed, nil
}

func buildIncidentRiskLinks(riskIDs []uuid.UUID) []entity.IncidentRiskLink {
	links := make([]entity.IncidentRiskLink, 0, len(riskIDs))
	for _, riskID := range riskIDs {
		links = append(links, entity.IncidentRiskLink{ID: riskID})
	}
	return links
}
