package performancerisk

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type Input struct {
	Period     string
	PlanningID *uuid.UUID
	OrgIDs     []uuid.UUID
}

type DetailInput struct {
	Input
	ROID uuid.UUID
}

type SummaryUseCase struct {
	repo repository.PerformanceRiskRepository
	now  func() time.Time
}

type PlanningMapUseCase struct {
	repo repository.PerformanceRiskRepository
	now  func() time.Time
}

type DetailUseCase struct {
	repo repository.PerformanceRiskRepository
	now  func() time.Time
}

type UnlinkedUseCase struct {
	repo repository.PerformanceRiskRepository
}

func NewSummaryUseCase(repo repository.PerformanceRiskRepository) *SummaryUseCase {
	return &SummaryUseCase{repo: repo, now: time.Now}
}

func NewPlanningMapUseCase(repo repository.PerformanceRiskRepository) *PlanningMapUseCase {
	return &PlanningMapUseCase{repo: repo, now: time.Now}
}

func NewDetailUseCase(repo repository.PerformanceRiskRepository) *DetailUseCase {
	return &DetailUseCase{repo: repo, now: time.Now}
}

func NewUnlinkedUseCase(repo repository.PerformanceRiskRepository) *UnlinkedUseCase {
	return &UnlinkedUseCase{repo: repo}
}

func (uc *SummaryUseCase) Execute(ctx context.Context, input Input) (*entity.PerformanceRiskSummary, error) {
	filter, err := buildFilter(input)
	if err != nil {
		return nil, err
	}

	nodes, err := uc.repo.ListPlanningNodes(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk planning nodes")
	}
	risks, err := uc.repo.ListRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk rows")
	}
	unlinked, err := uc.repo.ListUnlinkedRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list unlinked performance risks")
	}

	byRO := groupRisksByRO(risks)
	out := &entity.PerformanceRiskSummary{
		Period:        filter.Period,
		TotalRO:       len(nodes),
		TotalRisks:    len(risks) + len(unlinked),
		UnlinkedRisks: len(unlinked),
	}
	for _, node := range nodes {
		if node == nil {
			continue
		}
		metrics := BuildNodeMetrics(byRO[node.ROID], uc.now())
		if metrics.RiskCount > 0 {
			out.LinkedRO++
		} else {
			out.UnlinkedRO++
		}
		if metrics.HighExtremeCount > 0 {
			out.HighOrExtremeRO++
		}
		out.TotalMitigations += metrics.MitigationTotal
		out.OverdueMitigations += metrics.MitigationOverdue
	}
	return out, nil
}

func (uc *PlanningMapUseCase) Execute(ctx context.Context, input Input) ([]*entity.PerformanceRiskNode, error) {
	filter, err := buildFilter(input)
	if err != nil {
		return nil, err
	}

	nodes, err := uc.repo.ListPlanningNodes(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk planning nodes")
	}
	risks, err := uc.repo.ListRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk rows")
	}
	byRO := groupRisksByRO(risks)

	out := make([]*entity.PerformanceRiskNode, 0, len(nodes))
	for _, node := range nodes {
		if node == nil {
			continue
		}
		out = append(out, &entity.PerformanceRiskNode{
			PerformanceRiskPlanningNode: *node,
			PerformanceRiskMetrics:      BuildNodeMetrics(byRO[node.ROID], uc.now()),
		})
	}
	sort.Slice(out, func(i, j int) bool {
		left := out[i]
		right := out[j]
		if left.TotalExposure != right.TotalExposure {
			return left.TotalExposure > right.TotalExposure
		}
		if left.HighExtremeCount != right.HighExtremeCount {
			return left.HighExtremeCount > right.HighExtremeCount
		}
		if left.MitigationOverdue != right.MitigationOverdue {
			return left.MitigationOverdue > right.MitigationOverdue
		}
		return left.ROTitle < right.ROTitle
	})
	return out, nil
}

func (uc *DetailUseCase) Execute(ctx context.Context, input DetailInput) (*entity.PerformanceRiskDetail, error) {
	if input.ROID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	filter, err := buildFilter(input.Input)
	if err != nil {
		return nil, err
	}

	nodes, err := uc.repo.ListPlanningNodes(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk planning nodes")
	}
	var selected *entity.PerformanceRiskPlanningNode
	for _, node := range nodes {
		if node != nil && node.ROID == input.ROID {
			selected = node
			break
		}
	}
	if selected == nil {
		return nil, errors.ErrNotFound
	}

	allRisks, err := uc.repo.ListRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk rows")
	}
	risks := filterRisksByRO(allRisks, input.ROID)

	mitigations, err := uc.repo.ListMitigationRowsByROID(ctx, input.ROID, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk mitigations")
	}

	return &entity.PerformanceRiskDetail{
		Node: entity.PerformanceRiskNode{
			PerformanceRiskPlanningNode: *selected,
			PerformanceRiskMetrics:      BuildNodeMetrics(risks, uc.now()),
		},
		Risks:       risks,
		Mitigations: mitigations,
		Units:       buildUnitBreakdown(risks),
		GeneratedAt: uc.now(),
	}, nil
}

func (uc *UnlinkedUseCase) Execute(ctx context.Context, input Input) ([]*entity.PerformanceRiskRiskRow, error) {
	filter, err := buildFilter(input)
	if err != nil {
		return nil, err
	}

	items, err := uc.repo.ListUnlinkedRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list unlinked performance risks")
	}
	return items, nil
}

func buildFilter(input Input) (entity.PerformanceRiskFilter, error) {
	period := strings.TrimSpace(input.Period)
	if period == "" && input.PlanningID == nil {
		return entity.PerformanceRiskFilter{}, errors.ErrInvalidInput
	}

	return entity.PerformanceRiskFilter{
		Period:     period,
		PlanningID: input.PlanningID,
		OrgIDs:     input.OrgIDs,
	}, nil
}

func groupRisksByRO(risks []*entity.PerformanceRiskRiskRow) map[uuid.UUID][]*entity.PerformanceRiskRiskRow {
	out := make(map[uuid.UUID][]*entity.PerformanceRiskRiskRow)
	for _, risk := range risks {
		if risk == nil || risk.ROID == nil {
			continue
		}
		out[*risk.ROID] = append(out[*risk.ROID], risk)
	}
	return out
}

func filterRisksByRO(risks []*entity.PerformanceRiskRiskRow, roID uuid.UUID) []*entity.PerformanceRiskRiskRow {
	out := make([]*entity.PerformanceRiskRiskRow, 0)
	for _, risk := range risks {
		if risk != nil && risk.ROID != nil && *risk.ROID == roID {
			out = append(out, risk)
		}
	}
	return out
}

func buildUnitBreakdown(risks []*entity.PerformanceRiskRiskRow) []entity.PerformanceRiskUnitBreakdown {
	byOrg := make(map[string]*entity.PerformanceRiskUnitBreakdown)
	for _, risk := range risks {
		if risk == nil {
			continue
		}

		key := risk.OrganizationName
		if risk.OrganizationID != nil {
			key = risk.OrganizationID.String()
		}

		row := byOrg[key]
		if row == nil {
			row = &entity.PerformanceRiskUnitBreakdown{
				OrganizationID:   risk.OrganizationID,
				OrganizationName: risk.OrganizationName,
			}
			byOrg[key] = row
		}

		row.RiskCount++
		row.TotalExposure += risk.InherentScore
		level := entity.GetRiskLevelFromNilai(float64(risk.InherentScore))
		if level == entity.RiskLevelTinggi || level == entity.RiskLevelSangatTinggi {
			row.HighExtremeCount++
		}
	}

	out := make([]entity.PerformanceRiskUnitBreakdown, 0, len(byOrg))
	for _, row := range byOrg {
		out = append(out, *row)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].TotalExposure != out[j].TotalExposure {
			return out[i].TotalExposure > out[j].TotalExposure
		}
		return out[i].OrganizationName < out[j].OrganizationName
	})
	return out
}
