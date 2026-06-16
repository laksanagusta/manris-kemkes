package tmpmr

import (
	"fmt"
	"slices"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

var tmpmrDimensionOrder = map[string]int{
	"governance":          1,
	"context_criteria":    2,
	"risk_assessment":     3,
	"risk_treatment":      4,
	"monitoring_review":   5,
	"recording_reporting": 6,
}

func normalizeTMPMRItems(items []entity.TMPMRItem) ([]entity.TMPMRItem, error) {
	if len(items) == 0 {
		items = entity.DefaultTMPMRItems()
	}

	normalized := make([]entity.TMPMRItem, len(items))
	seen := make(map[string]struct{}, len(items))
	for i, item := range items {
		item.Dimension = strings.TrimSpace(item.Dimension)
		item.Question = strings.TrimSpace(item.Question)
		item.EvidenceURL = strings.TrimSpace(item.EvidenceURL)
		item.Notes = strings.TrimSpace(item.Notes)

		if _, ok := tmpmrDimensionOrder[item.Dimension]; !ok {
			return nil, fmt.Errorf("dimensi TMPMR tidak valid: %s", item.Dimension)
		}
		if item.Question == "" {
			return nil, fmt.Errorf("pertanyaan TMPMR wajib diisi")
		}
		if item.Score < 0 || item.Score > 5 {
			return nil, fmt.Errorf("skor TMPMR harus antara 0 dan 5")
		}
		if _, exists := seen[item.Dimension]; exists {
			return nil, fmt.Errorf("dimensi TMPMR duplikat: %s", item.Dimension)
		}
		seen[item.Dimension] = struct{}{}

		if item.ID == uuid.Nil {
			item.ID = uuid.New()
		}
		normalized[i] = item
	}

	if len(normalized) != len(tmpmrDimensionOrder) {
		return nil, fmt.Errorf("penilaian TMPMR harus berisi tepat 6 item")
	}

	slices.SortFunc(normalized, func(a, b entity.TMPMRItem) int {
		return tmpmrDimensionOrder[a.Dimension] - tmpmrDimensionOrder[b.Dimension]
	})

	return normalized, nil
}

func scoreTMPMRAssessment(assessment *entity.TMPMRAssessment) {
	score, level := entity.CalculateTMPMRScore(assessment.Items)
	assessment.Score = score
	assessment.MaturityLevel = level
}

func canAccessTMPMRRead(scope *entity.AccessScope, orgID uuid.UUID) bool {
	if scope == nil {
		return false
	}
	return scope.CanRead(orgID)
}

func canAccessTMPMRWrite(scope *entity.AccessScope, orgID uuid.UUID) bool {
	if scope == nil {
		return false
	}
	return scope.CanWrite(orgID)
}
