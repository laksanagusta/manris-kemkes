package form

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type FieldAnalytics struct {
	FieldKey     string
	FieldLabel   string
	FieldType    string
	FilledCount  int
	EmptyCount   int
	OptionCounts map[string]int
	Trends       []entity.TrendPoint
}

type FormAnalyticsSummary struct {
	FormID         uuid.UUID
	TotalResponses int
	Fields         []FieldAnalytics
}

type FormAnalyticsUseCase struct {
	formRepo     repository.FormRepository
	responseRepo repository.FormResponseRepository
}

func NewFormAnalyticsUseCase(
	formRepo repository.FormRepository,
	responseRepo repository.FormResponseRepository,
) *FormAnalyticsUseCase {
	return &FormAnalyticsUseCase{
		formRepo:     formRepo,
		responseRepo: responseRepo,
	}
}

type FormAnalyticsInput struct {
	FormID uuid.UUID
	Scope  *entity.AccessScope
}

func (uc *FormAnalyticsUseCase) Execute(ctx context.Context, input FormAnalyticsInput) (*FormAnalyticsSummary, error) {
	if input.Scope == nil {
		return nil, domainerrors.ErrForbidden
	}

	form, err := uc.formRepo.GetByID(ctx, input.FormID)
	if err != nil {
		return nil, err
	}

	if !input.Scope.IsGlobal {
		if form.OrganizationID == nil || !input.Scope.CanRead(*form.OrganizationID) {
			return nil, domainerrors.ErrForbidden
		}
	}

	allFields := collectAllFields(form)

	totalResponses, err := uc.responseRepo.CountByFormID(ctx, input.FormID)
	if err != nil {
		return nil, err
	}

	aggregations, err := uc.responseRepo.GetFieldAggregations(ctx, input.FormID, allFields)
	if err != nil {
		return nil, err
	}

	trends, err := uc.responseRepo.GetFieldTrends(ctx, input.FormID, allFields, "week")
	if err != nil {
		return nil, err
	}

	aggByKey := make(map[string]entity.FormFieldAnalytics, len(aggregations))
	for _, agg := range aggregations {
		aggByKey[agg.FieldKey] = agg
	}

	trendByKey := make(map[string][]entity.TrendPoint, len(trends))
	for _, t := range trends {
		trendByKey[t.FieldKey] = t.Trends
	}

	fields := make([]FieldAnalytics, 0, len(allFields))
	for _, field := range allFields {
		fa := FieldAnalytics{
			FieldKey:   field.FieldKey,
			FieldLabel: field.Label,
			FieldType:  field.FieldType,
			Trends:     trendByKey[field.FieldKey],
		}

		agg, exists := aggByKey[field.FieldKey]
		if exists {
			switch field.FieldType {
			case entity.FieldTypeText, entity.FieldTypeTextarea:
				fa.FilledCount = agg.Summary["filled"]
				fa.EmptyCount = agg.Summary["total"] - agg.Summary["filled"]
			case entity.FieldTypeRadio, entity.FieldTypeDropdown, entity.FieldTypeCheckbox:
				fa.OptionCounts = agg.Summary
			}
		}

		fields = append(fields, fa)
	}

	return &FormAnalyticsSummary{
		FormID:         input.FormID,
		TotalResponses: totalResponses,
		Fields:         fields,
	}, nil
}
