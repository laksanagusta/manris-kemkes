package operator_work

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
	riskuc "github.com/manris/backend/internal/usecase/risk"
	"sort"
	"time"
)

type Candidate struct {
	Item           entity.OperatorWorkItem
	OwnerID        *uuid.UUID
	PeriodEnd      string
	EffectiveCycle string
	PreviousStatus string
}

type Repository interface {
	ListCandidates(context.Context, uuid.UUID, time.Time) ([]Candidate, error)
}
type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) List(ctx context.Context, orgID, actorID uuid.UUID, page, limit int) (*entity.OperatorWorkPage, error) {
	if orgID == uuid.Nil || actorID == uuid.Nil || page < 1 || page > 100000 || limit < 1 || limit > 50 {
		return nil, fmt.Errorf("invalid work scope or pagination")
	}
	now := time.Now().In(timeutil.JakartaLocation())
	candidates, err := s.repo.ListCandidates(ctx, orgID, now)
	if err != nil {
		return nil, fmt.Errorf("list operator work: %w", err)
	}
	items := BuildItems(candidates, actorID, now)
	start := (page - 1) * limit
	if start > len(items) {
		start = len(items)
	}
	end := start + limit
	if end > len(items) {
		end = len(items)
	}
	return &entity.OperatorWorkPage{Items: items[start:end], Page: page, HasNext: end < len(items), Total: len(items), Today: now.Format("2006-01-02")}, nil
}

// BuildItems follows the existing visible quarter policy without mutating tasks.
func BuildItems(candidates []Candidate, actorID uuid.UUID, now time.Time) []entity.OperatorWorkItem {
	now = now.In(timeutil.JakartaLocation())
	today := now.Format("2006-01-02")
	items := make([]entity.OperatorWorkItem, 0, len(candidates))
	seen := map[string]bool{}
	for _, c := range candidates {
		item := c.Item
		personal := c.OwnerID != nil && *c.OwnerID == actorID
		if c.OwnerID != nil && !personal && item.Kind != "monitoring_draft" {
			continue
		}
		item.Responsibility = "unit"
		if personal {
			item.Responsibility = "personal"
		}
		switch item.Kind {
		case "risk_draft":
			if !personal {
				continue
			}
			item.ActionLabel = "Lengkapi risiko"
		case "mitigation_report":
			if _, err := time.Parse("2006-01-02", c.PeriodEnd); err != nil {
				continue
			}
			if _, err := time.Parse("2006-01-02", item.DueDate); err != nil {
				continue
			}
			if item.DueDate > now.AddDate(0, 0, 7).Format("2006-01-02") {
				continue
			}
			if today <= c.PeriodEnd && c.PeriodEnd != item.DueDate {
				continue
			}
			item.ActionLabel = "Isi laporan"
		case "monitoring_start":
			if !riskuc.IsValidQuarterFormat(item.Period) || !riskuc.IsValidQuarterFormat(c.EffectiveCycle) {
				continue
			}
			cmp, err := riskuc.CompareCycles(item.Period, c.EffectiveCycle)
			if err != nil || cmp < 0 {
				continue
			}
			if !entity.MonitoringWindowOpen(item.Period, now) {
				continue
			}
			_, end, _ := entity.MonitoringWindow(item.Period)
			item.DueDate = end.AddDate(0, 0, -1).Format("2006-01-02")
			item.ActionLabel = "Mulai pemantauan"
		case "monitoring_draft":
			if !entity.MonitoringWindowOpen(item.Period, now) {
				continue
			}
			_, end, _ := entity.MonitoringWindow(item.Period)
			item.DueDate = end.AddDate(0, 0, -1).Format("2006-01-02")
			item.ActionLabel = "Lanjutkan pemantauan"
		default:
			continue
		}
		if seen[item.Key] {
			continue
		}
		seen[item.Key] = true
		items = append(items, item)
	}
	sort.SliceStable(items, func(i, j int) bool {
		a, b := items[i], items[j]
		if (a.DueDate == "") != (b.DueDate == "") {
			return a.DueDate != ""
		}
		if a.DueDate != b.DueDate {
			return a.DueDate < b.DueDate
		}
		if !a.CreatedAt.Equal(b.CreatedAt) {
			return a.CreatedAt.Before(b.CreatedAt)
		}
		return a.Key < b.Key
	})
	return items
}
