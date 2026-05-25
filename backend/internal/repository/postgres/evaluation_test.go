package postgres_test

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
)

func setupPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL is not set")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("ParseConfig: %v", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatalf("NewWithConfig: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Skipf("database unavailable: %v", err)
	}

	t.Cleanup(func() { pool.Close() })
	return pool
}

func insertTestOrganization(t *testing.T, pool *pgxpool.Pool, name string) uuid.UUID {
	t.Helper()

	orgID := uuid.New()
	if _, err := pool.Exec(context.Background(), `INSERT INTO organizations (id, name) VALUES ($1, $2)`, orgID, name); err != nil {
		t.Fatalf("insert organization: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM organizations WHERE id = $1`, orgID)
	})
	return orgID
}

func cloneTemplateForEvaluation(t *testing.T, template *entity.EvaluationTemplate, orgID uuid.UUID, period string) *entity.Evaluation {
	t.Helper()

	sections := make([]entity.EvaluationSection, 0, len(template.Sections))
	for _, templateSection := range template.Sections {
		section := entity.EvaluationSection{
			SectionKey:  templateSection.SectionKey,
			Title:       templateSection.Title,
			Description: templateSection.Description,
			SortOrder:   templateSection.SortOrder,
			Items:       make([]entity.EvaluationItem, 0, len(templateSection.Items)),
		}
		for _, templateItem := range templateSection.Items {
			section.Items = append(section.Items, entity.EvaluationItem{
				ItemKey:     templateItem.ItemKey,
				ItemNo:      templateItem.ItemNo,
				Label:       templateItem.Label,
				Answer:      entity.EvaluationAnswerUnset,
				Condition:   templateItem.DefaultCondition,
				Description: templateItem.DefaultDescription,
				Analysis:    templateItem.DefaultAnalysis,
				SortOrder:   templateItem.SortOrder,
			})
		}
		sections = append(sections, section)
	}

	return &entity.Evaluation{
		OrganizationID: orgID,
		Period:         period,
		TemplateID:     template.ID,
		Status:         entity.EvaluationStatusDraft,
		Sections:       sections,
	}
}

func TestEvaluationRepositoryCreateCopiesAndReadsSections(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewEvaluationRepository(pool)
	ctx := context.Background()

	orgID := insertTestOrganization(t, pool, "Evaluation Repo Test Org")
	template, err := repo.GetActiveTemplate(ctx, "monitoring_evaluation_kmk")
	if err != nil {
		t.Fatalf("GetActiveTemplate: %v", err)
	}

	evaluation := cloneTemplateForEvaluation(t, template, orgID, "2026-H1")
	if err := repo.Create(ctx, evaluation); err != nil {
		t.Fatalf("Create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM evaluations WHERE id = $1`, evaluation.ID)
	})

	got, err := repo.GetByID(ctx, evaluation.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.OrganizationID != orgID {
		t.Fatalf("OrganizationID = %s, want %s", got.OrganizationID, orgID)
	}
	if got.TemplateName != "Laporan Monitoring & Evaluasi MR - KMK" {
		t.Fatalf("TemplateName = %q, want KMK template label", got.TemplateName)
	}
	if len(got.Sections) != len(template.Sections) {
		t.Fatalf("section count = %d, want %d", len(got.Sections), len(template.Sections))
	}
	if len(got.Sections[0].Items) == 0 {
		t.Fatal("expected copied evaluation items")
	}
	if got.Sections[0].Items[0].Answer != entity.EvaluationAnswerUnset {
		t.Fatalf("Answer = %q, want unset", got.Sections[0].Items[0].Answer)
	}
}

func TestEvaluationRepositoryRejectsDuplicateOrgPeriodTemplate(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewEvaluationRepository(pool)
	ctx := context.Background()

	orgID := insertTestOrganization(t, pool, "Evaluation Repo Duplicate Org")
	template, err := repo.GetActiveTemplate(ctx, "monitoring_evaluation_kmk")
	if err != nil {
		t.Fatalf("GetActiveTemplate: %v", err)
	}

	evaluation := cloneTemplateForEvaluation(t, template, orgID, "2026-H1")
	if err := repo.Create(ctx, evaluation); err != nil {
		t.Fatalf("Create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM evaluations WHERE id = $1`, evaluation.ID)
	})

	exists, err := repo.ExistsByOrgPeriodTemplate(ctx, orgID, "2026-H1", template.ID, nil)
	if err != nil {
		t.Fatalf("ExistsByOrgPeriodTemplate: %v", err)
	}
	if !exists {
		t.Fatal("expected duplicate evaluation to exist")
	}

	exists, err = repo.ExistsByOrgPeriodTemplate(ctx, orgID, "2026-H1", template.ID, &evaluation.ID)
	if err != nil {
		t.Fatalf("ExistsByOrgPeriodTemplate(exclude): %v", err)
	}
	if exists {
		t.Fatal("expected excluded evaluation not to count as duplicate")
	}
}

func TestEvaluationRepositoryUpdateReplacesSnapshotFields(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewEvaluationRepository(pool)
	ctx := context.Background()

	orgID := insertTestOrganization(t, pool, "Evaluation Repo Update Org")
	template, err := repo.GetActiveTemplate(ctx, "monitoring_evaluation_kmk")
	if err != nil {
		t.Fatalf("GetActiveTemplate: %v", err)
	}

	evaluation := cloneTemplateForEvaluation(t, template, orgID, "2026-H1")
	if err := repo.Create(ctx, evaluation); err != nil {
		t.Fatalf("Create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM evaluations WHERE id = $1`, evaluation.ID)
	})

	evaluation.ReportNumber = "LHME-001"
	evaluation.Sections[0].Conclusion = "Dokumen belum lengkap."
	evaluation.Sections[0].Items[0].Answer = entity.EvaluationAnswerNo
	evaluation.Sections[0].Items[0].Condition = "SK tim belum tersedia."
	if err := repo.Update(ctx, evaluation); err != nil {
		t.Fatalf("Update: %v", err)
	}

	got, err := repo.GetByID(ctx, evaluation.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.ReportNumber != "LHME-001" {
		t.Fatalf("ReportNumber = %q, want LHME-001", got.ReportNumber)
	}
	if got.Sections[0].Conclusion != "Dokumen belum lengkap." {
		t.Fatalf("Conclusion = %q, want updated conclusion", got.Sections[0].Conclusion)
	}
	if got.Sections[0].Items[0].Answer != entity.EvaluationAnswerNo {
		t.Fatalf("Answer = %q, want no", got.Sections[0].Items[0].Answer)
	}
	if got.Sections[0].Items[0].Condition != "SK tim belum tersedia." {
		t.Fatalf("Condition = %q, want updated condition", got.Sections[0].Items[0].Condition)
	}
}
