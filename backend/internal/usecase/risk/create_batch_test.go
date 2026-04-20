package risk

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeBatchRiskRepo struct {
	created []*entity.Risk
	nextNum int
}

func (r *fakeBatchRiskRepo) Create(_ context.Context, risk *entity.Risk) error {
	risk.ID = uuid.New()
	risk.CreatedAt = risk.CreatedAt.UTC()
	risk.UpdatedAt = risk.UpdatedAt.UTC()
	risk.InherentScore = risk.Probability * risk.Impact
	risk.TargetScore = risk.TargetProbability * risk.TargetImpact
	r.created = append(r.created, risk)
	return nil
}

func (r *fakeBatchRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeBatchRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *fakeBatchRiskRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *fakeBatchRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (r *fakeBatchRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) NextRiskCode(context.Context) (string, error) {
	r.nextNum++
	return "R-00" + string(rune('0'+r.nextNum)), nil
}
func (r *fakeBatchRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return nil
}
func (r *fakeBatchRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (r *fakeBatchRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (r *fakeBatchRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

var _ repo.RiskRepository = (*fakeBatchRiskRepo)(nil)

type fakeBatchUserRepo struct{}

func (r *fakeBatchUserRepo) Create(context.Context, *entity.User) error { return nil }
func (r *fakeBatchUserRepo) GetByID(context.Context, uuid.UUID) (*entity.User, error) {
	return &entity.User{ID: uuid.New(), Name: "Tester"}, nil
}
func (r *fakeBatchUserRepo) GetByUsername(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (r *fakeBatchUserRepo) Update(context.Context, *entity.User) error   { return nil }
func (r *fakeBatchUserRepo) Delete(context.Context, uuid.UUID) error      { return nil }
func (r *fakeBatchUserRepo) List(context.Context) ([]*entity.User, error) { return nil, nil }
func (r *fakeBatchUserRepo) ListWithFilter(context.Context, repo.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

var _ repo.UserRepository = (*fakeBatchUserRepo)(nil)

type fakeBatchOrgRepo struct{}

func (r *fakeBatchOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *fakeBatchOrgRepo) GetByID(context.Context, uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: uuid.New(), Name: "Org"}, nil
}
func (r *fakeBatchOrgRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *fakeBatchOrgRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *fakeBatchOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r *fakeBatchOrgRepo) ListWithFilter(context.Context, repo.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *fakeBatchOrgRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (r *fakeBatchOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) {
	return "", nil
}

var _ repo.OrganizationRepository = (*fakeBatchOrgRepo)(nil)

func TestCreateRiskBatchUseCase_Execute_PartialSuccess(t *testing.T) {
	riskRepo := &fakeBatchRiskRepo{}
	createUC := NewCreateRiskUseCase(riskRepo, &fakeBatchUserRepo{}, &fakeBatchOrgRepo{})
	batchUC := NewCreateRiskBatchUseCase(createUC)
	createdBy := uuid.New()

	result, err := batchUC.Execute(context.Background(), CreateRiskBatchInput{
		CreatedBy: &createdBy,
		Items: []CreateRiskBatchItemInput{
			{
				ClientKey:         "row-1",
				Title:             "Fraud pembayaran",
				Description:       "Pembayaran tidak sesuai kewenangan",
				Category:          entity.RiskCategoryOperasional,
				Cause:             []string{"Kontrol lemah"},
				Controllability:   "C",
				ImpactDesc:        []string{"Kerugian negara"},
				Probability:       4,
				Impact:            4,
				Weight:            1.8,
				TreatmentOption:   "Mitigasi Risiko",
				Mitigations:       []entity.Mitigation{{Action: "Perketat review", Owner: "SPI"}},
				TargetProbability: 2,
				TargetImpact:      2,
				TargetWeight:      1.2,
			},
			{
				ClientKey:         "row-2",
				Title:             "",
				Description:       "Baris invalid",
				Probability:       3,
				Impact:            3,
				TargetProbability: 1,
				TargetImpact:      1,
				TargetWeight:      1,
			},
		},
	})

	if err != nil {
		t.Fatalf("expected no batch error, got %v", err)
	}
	if len(result.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(result.Items))
	}
	if result.Items[0].Status != "created" {
		t.Fatalf("expected first item created, got %s", result.Items[0].Status)
	}
	if result.Items[1].Status != "failed" {
		t.Fatalf("expected second item failed, got %s", result.Items[1].Status)
	}
	if len(riskRepo.created) != 1 {
		t.Fatalf("expected 1 created risk, got %d", len(riskRepo.created))
	}
	if riskRepo.created[0].TreatmentOption != "mitigate" {
		t.Fatalf("expected normalized treatment option mitigate, got %s", riskRepo.created[0].TreatmentOption)
	}
}

func TestCreateRiskBatchUseCase_Execute_RequiresMitigationOwner(t *testing.T) {
	riskRepo := &fakeBatchRiskRepo{}
	createUC := NewCreateRiskUseCase(riskRepo, &fakeBatchUserRepo{}, &fakeBatchOrgRepo{})
	batchUC := NewCreateRiskBatchUseCase(createUC)
	createdBy := uuid.New()

	result, err := batchUC.Execute(context.Background(), CreateRiskBatchInput{
		CreatedBy: &createdBy,
		Items: []CreateRiskBatchItemInput{{
			ClientKey:         "row-1",
			Title:             "Mark-up estimasi",
			Description:       "Harga tidak wajar",
			Category:          entity.RiskCategoryOperasional,
			Cause:             []string{"Verifikasi lemah"},
			Controllability:   "C",
			ImpactDesc:        []string{"Kerugian perusahaan"},
			Probability:       3,
			Impact:            4,
			Weight:            1.4,
			Mitigations:       []entity.Mitigation{{Action: "Cek silang vendor"}},
			TargetProbability: 2,
			TargetImpact:      2,
			TargetWeight:      1,
		}},
	})

	if err != nil {
		t.Fatalf("expected no batch error, got %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Status != "failed" {
		t.Fatalf("expected item failed, got %s", result.Items[0].Status)
	}
	if len(riskRepo.created) != 0 {
		t.Fatalf("expected no created risks, got %d", len(riskRepo.created))
	}
}

func TestCreateRiskBatchUseCase_ExecutePersistsCategory(t *testing.T) {
	riskRepo := &fakeBatchRiskRepo{}
	createUC := NewCreateRiskUseCase(riskRepo, &fakeBatchUserRepo{}, &fakeBatchOrgRepo{})
	batchUC := NewCreateRiskBatchUseCase(createUC)
	createdBy := uuid.New()

	result, err := batchUC.Execute(context.Background(), CreateRiskBatchInput{
		CreatedBy: &createdBy,
		Items: []CreateRiskBatchItemInput{{
			ClientKey:         "row-1",
			Title:             "Gangguan layanan",
			Description:       "Layanan tidak tersedia",
			Category:          entity.RiskCategoryTeknologiInformasi,
			Controllability:   "C",
			Probability:       3,
			Impact:            4,
			TargetProbability: 2,
			TargetImpact:      2,
			TargetWeight:      1,
		}},
	})

	if err != nil {
		t.Fatalf("expected no batch error, got %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Status != "created" {
		t.Fatalf("expected item created, got %s", result.Items[0].Status)
	}
	if len(riskRepo.created) != 1 {
		t.Fatalf("expected 1 created risk, got %d", len(riskRepo.created))
	}
	if riskRepo.created[0].Category != entity.RiskCategoryTeknologiInformasi {
		t.Fatalf("expected category %q, got %q", entity.RiskCategoryTeknologiInformasi, riskRepo.created[0].Category)
	}
}

func TestCreateRiskBatchUseCase_ExecuteTrimsCategory(t *testing.T) {
	riskRepo := &fakeBatchRiskRepo{}
	createUC := NewCreateRiskUseCase(riskRepo, &fakeBatchUserRepo{}, &fakeBatchOrgRepo{})
	batchUC := NewCreateRiskBatchUseCase(createUC)
	createdBy := uuid.New()

	result, err := batchUC.Execute(context.Background(), CreateRiskBatchInput{
		CreatedBy: &createdBy,
		Items: []CreateRiskBatchItemInput{{
			ClientKey:         "row-1",
			Title:             "Gangguan layanan",
			Description:       "Layanan tidak tersedia",
			Category:          "  teknologi_informasi  ",
			Controllability:   "C",
			Probability:       3,
			Impact:            4,
			TargetProbability: 2,
			TargetImpact:      2,
			TargetWeight:      1,
		}},
	})

	if err != nil {
		t.Fatalf("expected no batch error, got %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Status != "created" {
		t.Fatalf("expected item created, got %s", result.Items[0].Status)
	}
	if len(riskRepo.created) != 1 {
		t.Fatalf("expected 1 created risk, got %d", len(riskRepo.created))
	}
	if riskRepo.created[0].Category != entity.RiskCategoryTeknologiInformasi {
		t.Fatalf("expected trimmed canonical category %q, got %q", entity.RiskCategoryTeknologiInformasi, riskRepo.created[0].Category)
	}
}

func TestNormalizeTreatmentOption(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "menghindari", in: "menghindari", want: "avoid"},
		{name: "menghindari risiko", in: "Menghindari Risiko", want: "avoid"},
		{name: "berbagi", in: "berbagi", want: "transfer"},
		{name: "berbagi risiko", in: "Berbagi Risiko", want: "transfer"},
		{name: "mitigasi risiko", in: "Mitigasi Risiko", want: "mitigate"},
		{name: "menerima risiko", in: "Menerima risiko", want: "accept"},
		{name: "avoid unchanged", in: "avoid", want: "avoid"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeTreatmentOption(tt.in)
			if got != tt.want {
				t.Fatalf("expected %s, got %s", tt.want, got)
			}
		})
	}
}
