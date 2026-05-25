package evaluation

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeEvaluationRepo struct {
	templates map[string]*entity.EvaluationTemplate
	evals     map[uuid.UUID]*entity.Evaluation
	listErr   error
	createErr error
	updateErr error
	getErr    error
}

func newFakeEvaluationRepo() *fakeEvaluationRepo {
	return &fakeEvaluationRepo{
		templates: map[string]*entity.EvaluationTemplate{},
		evals:     map[uuid.UUID]*entity.Evaluation{},
	}
}

func (r *fakeEvaluationRepo) GetActiveTemplate(_ context.Context, templateKey string) (*entity.EvaluationTemplate, error) {
	template, ok := r.templates[templateKey]
	if !ok {
		return nil, fmt.Errorf("template not found")
	}
	copy := cloneTemplate(template)
	return &copy, nil
}

func (r *fakeEvaluationRepo) Create(_ context.Context, evaluation *entity.Evaluation) error {
	if r.createErr != nil {
		return r.createErr
	}
	if evaluation.ID == uuid.Nil {
		evaluation.ID = uuid.New()
	}
	cloned := cloneEvaluation(evaluation)
	r.evals[evaluation.ID] = &cloned
	return nil
}

func (r *fakeEvaluationRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Evaluation, error) {
	if r.getErr != nil {
		return nil, r.getErr
	}
	eval, ok := r.evals[id]
	if !ok {
		return nil, fmt.Errorf("not found")
	}
	copy := cloneEvaluation(eval)
	return &copy, nil
}

func (r *fakeEvaluationRepo) Update(_ context.Context, evaluation *entity.Evaluation) error {
	if r.updateErr != nil {
		return r.updateErr
	}
	cloned := cloneEvaluation(evaluation)
	r.evals[evaluation.ID] = &cloned
	return nil
}

func (r *fakeEvaluationRepo) List(_ context.Context, filter repository.EvaluationListFilter) ([]*entity.Evaluation, int, error) {
	if r.listErr != nil {
		return nil, 0, r.listErr
	}
	var result []*entity.Evaluation
	for _, eval := range r.evals {
		if filter.OrganizationID != nil && eval.OrganizationID != *filter.OrganizationID {
			continue
		}
		if filter.Period != "" && eval.Period != filter.Period {
			continue
		}
		if filter.Status != "" && string(eval.Status) != filter.Status {
			continue
		}
		copy := cloneEvaluation(eval)
		result = append(result, &copy)
	}
	return result, len(result), nil
}

func (r *fakeEvaluationRepo) ExistsByOrgPeriodTemplate(_ context.Context, orgID uuid.UUID, period string, templateID uuid.UUID, excludeID *uuid.UUID) (bool, error) {
	for _, eval := range r.evals {
		if eval.OrganizationID != orgID || eval.Period != period || eval.TemplateID != templateID {
			continue
		}
		if excludeID != nil && eval.ID == *excludeID {
			continue
		}
		return true, nil
	}
	return false, nil
}

var _ repository.EvaluationRepository = (*fakeEvaluationRepo)(nil)

func cloneTemplate(template *entity.EvaluationTemplate) entity.EvaluationTemplate {
	if template == nil {
		return entity.EvaluationTemplate{}
	}
	cloned := *template
	if len(template.Sections) > 0 {
		cloned.Sections = make([]entity.EvaluationTemplateSection, len(template.Sections))
		for i, section := range template.Sections {
			cloned.Sections[i] = section
			if len(section.Items) > 0 {
				cloned.Sections[i].Items = make([]entity.EvaluationTemplateItem, len(section.Items))
				copy(cloned.Sections[i].Items, section.Items)
			}
		}
	}
	return cloned
}

func cloneEvaluation(evaluation *entity.Evaluation) entity.Evaluation {
	if evaluation == nil {
		return entity.Evaluation{}
	}
	copy := *evaluation
	if evaluation.CreatedBy != nil {
		v := *evaluation.CreatedBy
		copy.CreatedBy = &v
	}
	if evaluation.FinalizedAt != nil {
		v := *evaluation.FinalizedAt
		copy.FinalizedAt = &v
	}
	if evaluation.ReportDate != nil {
		v := *evaluation.ReportDate
		copy.ReportDate = &v
	}
	if evaluation.AssignmentLetterDate != nil {
		v := *evaluation.AssignmentLetterDate
		copy.AssignmentLetterDate = &v
	}
	if len(evaluation.Sections) > 0 {
		copy.Sections = make([]entity.EvaluationSection, len(evaluation.Sections))
		for i, section := range evaluation.Sections {
			copy.Sections[i] = section
			if section.TemplateSectionID != nil {
				v := *section.TemplateSectionID
				copy.Sections[i].TemplateSectionID = &v
			}
			if len(section.Items) > 0 {
				copy.Sections[i].Items = make([]entity.EvaluationItem, len(section.Items))
				for j, item := range section.Items {
					copy.Sections[i].Items[j] = item
					if item.TemplateItemID != nil {
						v := *item.TemplateItemID
						copy.Sections[i].Items[j].TemplateItemID = &v
					}
				}
			}
		}
	}
	return copy
}

func buildEvaluationTemplate() *entity.EvaluationTemplate {
	templateID := uuid.New()
	sectionID := uuid.New()
	itemID := uuid.New()
	return &entity.EvaluationTemplate{
		ID:          templateID,
		TemplateKey: DefaultTemplateKey,
		Name:        "Monitoring Evaluation KMK",
		Version:     1,
		Status:      entity.EvaluationTemplateStatusActive,
		Sections: []entity.EvaluationTemplateSection{
			{
				ID:          sectionID,
				TemplateID:  templateID,
				SectionKey:  "document_completeness",
				Title:       "Kelengkapan dokumen",
				Description: "Dokumen pendukung",
				SortOrder:   1,
				Items: []entity.EvaluationTemplateItem{
					{
						ID:                 itemID,
						SectionID:          sectionID,
						ItemKey:            "doc_1",
						ItemNo:             "1",
						Label:              "Dokumen kebijakan",
						DefaultCondition:   "ada",
						DefaultDescription: "tersedia",
						DefaultAnalysis:    "cukup",
						SortOrder:          1,
					},
				},
			},
		},
	}
}

func TestCreateUseCaseCopiesActiveTemplateSnapshot(t *testing.T) {
	repo := newFakeEvaluationRepo()
	repo.templates[DefaultTemplateKey] = buildEvaluationTemplate()
	scope := &entity.AccessScope{OrganizationID: ptrUUID(uuid.New())}
	createdBy := uuid.New()

	uc := NewCreateUseCase(repo)
	result, err := uc.Execute(context.Background(), CreateInput{
		OrganizationID: *scope.OrganizationID,
		Period:         "2026-H1",
		CreatedBy:      &createdBy,
		Scope:          scope,
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result == nil || len(result.Sections) != 1 || len(result.Sections[0].Items) != 1 {
		t.Fatalf("unexpected snapshot result: %#v", result)
	}
	if result.Sections[0].Items[0].Answer != entity.EvaluationAnswerUnset {
		t.Fatalf("answer = %q, want unset", result.Sections[0].Items[0].Answer)
	}
	if result.TemplateName == "" || result.Status != entity.EvaluationStatusDraft {
		t.Fatalf("unexpected evaluation fields: %#v", result)
	}
}

func TestCreateUseCaseRejectsDuplicateEvaluation(t *testing.T) {
	repo := newFakeEvaluationRepo()
	template := buildEvaluationTemplate()
	repo.templates[DefaultTemplateKey] = template
	orgID := uuid.New()
	existing := &entity.Evaluation{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Period:         "2026-H1",
		TemplateID:     template.ID,
		Status:         entity.EvaluationStatusDraft,
	}
	repo.evals[existing.ID] = existing
	createdBy := uuid.New()

	uc := NewCreateUseCase(repo)
	_, err := uc.Execute(context.Background(), CreateInput{
		OrganizationID: orgID,
		Period:         "2026-H1",
		CreatedBy:      &createdBy,
		Scope:          &entity.AccessScope{OrganizationID: &orgID},
	})
	if !errors.IsValidation(err) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestUpdateUseCaseRejectsFinalEvaluation(t *testing.T) {
	repo := newFakeEvaluationRepo()
	orgID := uuid.New()
	eval := &entity.Evaluation{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Period:         "2026-H1",
		TemplateID:     uuid.New(),
		Status:         entity.EvaluationStatusFinal,
	}
	repo.evals[eval.ID] = eval

	uc := NewUpdateUseCase(repo)
	_, err := uc.Execute(context.Background(), UpdateInput{
		ID:    eval.ID,
		Scope: &entity.AccessScope{OrganizationID: &orgID},
	})
	if !errors.IsValidation(err) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestFinalizeUseCaseSetsFinalStatusAndTimestamp(t *testing.T) {
	repo := newFakeEvaluationRepo()
	orgID := uuid.New()
	eval := &entity.Evaluation{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Period:         "2026-H1",
		TemplateID:     uuid.New(),
		Status:         entity.EvaluationStatusDraft,
		Sections: []entity.EvaluationSection{
			{
				ID:           uuid.New(),
				EvaluationID: uuid.Nil,
				SectionKey:   "document_completeness",
				Title:        "Dokumen",
				Items: []entity.EvaluationItem{
					{ID: uuid.New(), SectionID: uuid.Nil, ItemKey: "doc_1", ItemNo: "1", Label: "Dokumen", Answer: entity.EvaluationAnswerYes},
				},
			},
		},
	}
	repo.evals[eval.ID] = eval

	uc := NewFinalizeUseCase(repo)
	result, err := uc.Execute(context.Background(), FinalizeInput{
		ID:    eval.ID,
		Scope: &entity.AccessScope{OrganizationID: &orgID},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result.Status != entity.EvaluationStatusFinal || result.FinalizedAt == nil {
		t.Fatalf("unexpected finalize result: %#v", result)
	}
}

func TestReopenUseCaseReturnsFinalToDraft(t *testing.T) {
	repo := newFakeEvaluationRepo()
	orgID := uuid.New()
	now := time.Now().UTC()
	eval := &entity.Evaluation{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Period:         "2026-H1",
		TemplateID:     uuid.New(),
		Status:         entity.EvaluationStatusFinal,
		FinalizedAt:    &now,
	}
	repo.evals[eval.ID] = eval

	uc := NewReopenUseCase(repo)
	result, err := uc.Execute(context.Background(), ReopenInput{
		ID:    eval.ID,
		Scope: &entity.AccessScope{OrganizationID: &orgID},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result.Status != entity.EvaluationStatusDraft || result.FinalizedAt != nil {
		t.Fatalf("unexpected reopen result: %#v", result)
	}
}

func TestListUseCaseRequiresReadableScope(t *testing.T) {
	repo := newFakeEvaluationRepo()
	orgID := uuid.New()
	repo.evals[uuid.New()] = &entity.Evaluation{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Period:         "2026-H1",
		TemplateID:     uuid.New(),
		Status:         entity.EvaluationStatusDraft,
	}

	uc := NewListUseCase(repo)
	_, err := uc.Execute(context.Background(), ListInput{
		OrganizationID: &orgID,
		Scope:          &entity.AccessScope{OrganizationID: ptrUUID(uuid.New())},
	})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func ptrUUID(id uuid.UUID) *uuid.UUID {
	return &id
}
