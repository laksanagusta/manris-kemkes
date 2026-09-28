package report

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/timeutil"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type QuarterlyReportInput struct {
	Cycle, ComparisonCycle string
	OrgIDs                 []uuid.UUID
}

type QuarterlyReportUseCase struct {
	repo repository.QuarterlyReportRepository
	now  func() time.Time
}

func NewQuarterlyReportUseCase(repo repository.QuarterlyReportRepository) *QuarterlyReportUseCase {
	return &QuarterlyReportUseCase{repo: repo, now: time.Now}
}

func (uc *QuarterlyReportUseCase) Execute(ctx context.Context, input QuarterlyReportInput) (*entity.QuarterlyReportData, error) {
	now := uc.now().In(timeutil.JakartaLocation())
	cycle := input.Cycle
	if cycle == "" {
		current := fmt.Sprintf("%04d-Q%d", now.Year(), (int(now.Month())-1)/3+1)
		cycle, _ = riskuc.PreviousQuarterCycle(current)
	}
	if !riskuc.IsValidQuarterFormat(cycle) || cycle[:4] == "0000" {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "cycle harus berformat YYYY-Q[1-4]")
	}
	comparison := input.ComparisonCycle
	if comparison == "" {
		comparison, _ = riskuc.PreviousQuarterCycle(cycle)
	}
	if !riskuc.IsValidQuarterFormat(comparison) || comparison[:4] == "0000" {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "compare_cycle harus berformat YYYY-Q[1-4]")
	}
	start, end := service.QuarterlyPeriodBounds(cycle)
	previousStart, previousEnd := service.QuarterlyPeriodBounds(comparison)
	snapshot, err := uc.repo.ReadSnapshot(ctx,
		repository.QuarterlyReportPeriod{Cycle: cycle, Start: start, End: end},
		repository.QuarterlyReportPeriod{Cycle: comparison, Start: previousStart, End: previousEnd}, input.OrgIDs)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to read quarterly report snapshot")
	}
	current, previous := snapshot.Current, snapshot.Previous
	result := &entity.QuarterlyReportData{
		Cycle: cycle, ComparisonCycle: comparison, GeneratedAt: now,
		Organizations: snapshot.Organizations, Risks: current.Risks, PreviousRisks: previous.Risks,
		Tasks: current.Tasks, PreviousTasks: previous.Tasks, Events: current.Events,
		Warnings: []string{}, DataUpdatedAt: current.DataUpdatedAt,
	}
	if previous.DataUpdatedAt != nil && (result.DataUpdatedAt == nil || previous.DataUpdatedAt.After(*result.DataUpdatedAt)) {
		result.DataUpdatedAt = previous.DataUpdatedAt
	}
	seen := map[string]bool{}
	for _, warnings := range [][]string{current.Warnings, previous.Warnings} {
		for _, warning := range warnings {
			if !seen[warning] {
				result.Warnings = append(result.Warnings, warning)
				seen[warning] = true
			}
		}
	}
	// Export equality includes empty units, deletions and reporting-date state,
	// which a maximum updated_at timestamp alone cannot represent.
	canonical := *result
	canonical.GeneratedAt = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, timeutil.JakartaLocation())
	payload, err := json.Marshal(canonical)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to fingerprint report snapshot")
	}
	digest := sha256.Sum256(payload)
	result.SnapshotHash = hex.EncodeToString(digest[:])
	return result, nil
}
