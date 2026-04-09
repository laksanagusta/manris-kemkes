package kri

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type fakeKRIRepository struct {
	items                map[uuid.UUID]*entity.KRI
	lastListIncludeValue bool
}

func (r *fakeKRIRepository) Create(_ context.Context, kri *entity.KRI) error {
	if r.items == nil {
		r.items = map[uuid.UUID]*entity.KRI{}
	}
	r.items[kri.ID] = kri
	return nil
}

func (r *fakeKRIRepository) GetByID(_ context.Context, id uuid.UUID) (*entity.KRI, error) {
	kri, ok := r.items[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return kri, nil
}

func (r *fakeKRIRepository) Update(_ context.Context, kri *entity.KRI) error {
	r.items[kri.ID] = kri
	return nil
}

func (r *fakeKRIRepository) Archive(_ context.Context, id uuid.UUID, reason string) error {
	kri, ok := r.items[id]
	if !ok {
		return errors.New("not found")
	}
	now := time.Now()
	kri.IsArchived = true
	kri.ArchivedAt = &now
	kri.ArchivedReason = reason
	return nil
}

func (r *fakeKRIRepository) List(_ context.Context, _ []uuid.UUID, includeArchived bool) ([]*entity.KRI, error) {
	r.lastListIncludeValue = includeArchived
	result := make([]*entity.KRI, 0)
	for _, kri := range r.items {
		if !includeArchived && kri.IsArchived {
			continue
		}
		result = append(result, kri)
	}
	return result, nil
}

func (r *fakeKRIRepository) Delete(_ context.Context, id uuid.UUID) error {
	delete(r.items, id)
	return nil
}

func (r *fakeKRIRepository) GetDashboard(_ context.Context, _ []uuid.UUID) (map[string]interface{}, error) {
	return map[string]interface{}{}, nil
}

func TestArchiveKRI(t *testing.T) {
	id := uuid.New()
	repo := &fakeKRIRepository{items: map[uuid.UUID]*entity.KRI{
		id: {
			ID:           id,
			Name:         "Unit infection response readiness",
			Metric:       "%",
			ThresholdMin: 0,
			ThresholdMax: 100,
			Direction:    "higher_worse",
			AmberThresholdMax: func() *float64 {
				v := 85.0
				return &v
			}(),
		},
	}}

	uc := NewArchiveKRIUseCase(repo)
	result, err := uc.Execute(context.Background(), ArchiveKRIInput{ID: id, Reason: "obsolete definition"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !result.IsArchived {
		t.Fatalf("expected archived KRI")
	}
	if result.ArchivedAt == nil {
		t.Fatalf("expected archived timestamp to be returned")
	}
	if result.ArchivedReason != "obsolete definition" {
		t.Fatalf("expected archive reason to be preserved")
	}

	preserved, err := repo.GetByID(context.Background(), id)
	if err != nil {
		t.Fatalf("expected archived row to remain retrievable, got %v", err)
	}
	if preserved.ID != id {
		t.Fatalf("expected same KRI row to be preserved")
	}
}

func TestKRIValidateRejectsMissingAmberThreshold(t *testing.T) {
	higher := &entity.KRI{
		ID:           uuid.New(),
		Name:         "Higher worse KRI",
		Metric:       "%",
		ThresholdMin: 0,
		ThresholdMax: 100,
		Direction:    "higher_worse",
	}
	if err := higher.Validate(); err == nil {
		t.Fatalf("expected validation error for higher_worse without amber max")
	}

	lower := &entity.KRI{
		ID:           uuid.New(),
		Name:         "Lower worse KRI",
		Metric:       "%",
		ThresholdMin: 0,
		ThresholdMax: 100,
		Direction:    "lower_worse",
	}
	if err := lower.Validate(); err == nil {
		t.Fatalf("expected validation error for lower_worse without amber min")
	}
}

func TestKRIValidatePreservesLegacyDirectionAliases(t *testing.T) {
	increasing := &entity.KRI{
		ID:           uuid.New(),
		Name:         "Increasing alias KRI",
		Metric:       "%",
		ThresholdMin: 0,
		ThresholdMax: 100,
		Direction:    "increasing",
	}
	if err := increasing.Validate(); err == nil {
		t.Fatalf("expected validation error for increasing without amber max")
	}

	decreasing := &entity.KRI{
		ID:           uuid.New(),
		Name:         "Decreasing alias KRI",
		Metric:       "%",
		ThresholdMin: 0,
		ThresholdMax: 100,
		Direction:    "decreasing",
	}
	if err := decreasing.Validate(); err == nil {
		t.Fatalf("expected validation error for decreasing without amber min")
	}
}

func TestKRIStatusAndBreachUseCanonicalDirectionVocabulary(t *testing.T) {
	higherAmber := 85.0
	lowerAmber := 30.0

	tests := []struct {
		name      string
		kri       entity.KRI
		breached  bool
		wantState string
	}{
		{
			name: "higher_worse warning",
			kri: entity.KRI{
				ThresholdMin:      0,
				ThresholdMax:      100,
				AmberThresholdMax: &higherAmber,
				CurrentValue:      90,
				Direction:         "higher_worse",
			},
			breached:  false,
			wantState: "warning",
		},
		{
			name: "higher_worse breached",
			kri: entity.KRI{
				ThresholdMin:      0,
				ThresholdMax:      100,
				AmberThresholdMax: &higherAmber,
				CurrentValue:      101,
				Direction:         "higher_worse",
			},
			breached:  true,
			wantState: "breached",
		},
		{
			name: "lower_worse warning",
			kri: entity.KRI{
				ThresholdMin:      20,
				ThresholdMax:      100,
				AmberThresholdMin: &lowerAmber,
				CurrentValue:      25,
				Direction:         "lower_worse",
			},
			breached:  false,
			wantState: "warning",
		},
		{
			name: "lower_worse breached",
			kri: entity.KRI{
				ThresholdMin:      20,
				ThresholdMax:      100,
				AmberThresholdMin: &lowerAmber,
				CurrentValue:      19,
				Direction:         "lower_worse",
			},
			breached:  true,
			wantState: "breached",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.kri.IsThresholdBreached(); got != tt.breached {
				t.Fatalf("expected breached=%v, got %v", tt.breached, got)
			}
			if got := tt.kri.GetStatus(); got != tt.wantState {
				t.Fatalf("expected status %q, got %q", tt.wantState, got)
			}
		})
	}
}

func TestKRIStatusAndBreachSupportLegacyDirectionAliases(t *testing.T) {
	higherAmber := 85.0
	lowerAmber := 30.0

	tests := []struct {
		name      string
		kri       entity.KRI
		breached  bool
		wantState string
	}{
		{
			name: "increasing alias warning",
			kri: entity.KRI{
				ThresholdMin:      0,
				ThresholdMax:      100,
				AmberThresholdMax: &higherAmber,
				CurrentValue:      90,
				Direction:         "increasing",
			},
			breached:  false,
			wantState: "warning",
		},
		{
			name: "decreasing alias warning",
			kri: entity.KRI{
				ThresholdMin:      20,
				ThresholdMax:      100,
				AmberThresholdMin: &lowerAmber,
				CurrentValue:      25,
				Direction:         "decreasing",
			},
			breached:  false,
			wantState: "warning",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.kri.IsThresholdBreached(); got != tt.breached {
				t.Fatalf("expected breached=%v, got %v", tt.breached, got)
			}
			if got := tt.kri.GetStatus(); got != tt.wantState {
				t.Fatalf("expected status %q, got %q", tt.wantState, got)
			}
		})
	}
}

func TestListKRIExcludesArchived(t *testing.T) {
	activeID := uuid.New()
	archivedID := uuid.New()
	repo := &fakeKRIRepository{items: map[uuid.UUID]*entity.KRI{
		activeID: {
			ID:                activeID,
			Name:              "Active KRI",
			Metric:            "%",
			ThresholdMin:      0,
			ThresholdMax:      100,
			Direction:         "higher_worse",
			AmberThresholdMax: func() *float64 { v := 85.0; return &v }(),
		},
		archivedID: {
			ID:                archivedID,
			Name:              "Archived KRI",
			Metric:            "%",
			ThresholdMin:      0,
			ThresholdMax:      100,
			Direction:         "higher_worse",
			AmberThresholdMax: func() *float64 { v := 85.0; return &v }(),
			IsArchived:        true,
		},
	}}

	uc := NewListKRIsUseCase(repo, nil)
	result, err := uc.Execute(context.Background(), ListKRIsInput{})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if repo.lastListIncludeValue {
		t.Fatalf("expected includeArchived=false by default")
	}
	if len(result) != 1 {
		t.Fatalf("expected only active KRI, got %d", len(result))
	}
	if result[0].ID != activeID {
		t.Fatalf("expected active KRI to be listed")
	}
}
