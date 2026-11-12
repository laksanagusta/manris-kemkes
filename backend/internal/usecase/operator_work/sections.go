package operator_work

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
	"time"
)

func ValidSection(key string) bool { return key == "reports" || key == "monitoring" || key == "drafts" }

func sectionItems(items []entity.OperatorWorkItem, key string) []entity.OperatorWorkItem {
	result := make([]entity.OperatorWorkItem, 0)
	for _, item := range items {
		if (key == "reports" && item.Kind == "mitigation_report") || (key == "drafts" && item.Kind == "risk_draft") || (key == "monitoring" && (item.Kind == "monitoring_start" || item.Kind == "monitoring_draft")) {
			result = append(result, item)
		}
	}
	return result
}

// BuildSections counts the entire eligible set before limiting each preview.
func BuildSections(items []entity.OperatorWorkItem) []entity.OperatorWorkSection {
	sections := make([]entity.OperatorWorkSection, 0, 3)
	for _, key := range []string{"reports", "monitoring", "drafts"} {
		group := sectionItems(items, key)
		total := len(group)
		if len(group) > 5 {
			group = group[:5]
		}
		sections = append(sections, entity.OperatorWorkSection{Key: key, Total: total, Items: group})
	}
	return sections
}

func PaginateSection(items []entity.OperatorWorkItem, key string, page, limit int) *entity.OperatorWorkPage {
	group := sectionItems(items, key)
	total := len(group)
	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}
	return &entity.OperatorWorkPage{Items: group[start:end], Page: page, HasNext: end < total, Total: total}
}

func (s *Service) eligibleItems(ctx context.Context, orgID, actorID uuid.UUID, now time.Time) ([]entity.OperatorWorkItem, error) {
	if orgID == uuid.Nil || actorID == uuid.Nil {
		return nil, fmt.Errorf("invalid work scope")
	}
	candidates, err := s.repo.ListCandidates(ctx, orgID, now)
	if err != nil {
		return nil, fmt.Errorf("list operator work: %w", err)
	}
	return BuildItems(candidates, actorID, now), nil
}
func (s *Service) Sections(ctx context.Context, orgID, actorID uuid.UUID) (*entity.OperatorWorkSummary, error) {
	now := timeutil.BusinessNow().In(timeutil.JakartaLocation())
	items, err := s.eligibleItems(ctx, orgID, actorID, now)
	if err != nil {
		return nil, err
	}
	return &entity.OperatorWorkSummary{Sections: BuildSections(items), Today: now.Format("2006-01-02")}, nil
}
func (s *Service) ListSection(ctx context.Context, orgID, actorID uuid.UUID, key string, page, limit int) (*entity.OperatorWorkPage, error) {
	if !ValidSection(key) || page < 1 || page > 100000 || limit < 1 || limit > 50 {
		return nil, fmt.Errorf("invalid work section or pagination")
	}
	now := timeutil.BusinessNow().In(timeutil.JakartaLocation())
	items, err := s.eligibleItems(ctx, orgID, actorID, now)
	if err != nil {
		return nil, err
	}
	result := PaginateSection(items, key, page, limit)
	result.Today = now.Format("2006-01-02")
	return result, nil
}
