package risk

import (
	"context"
	"fmt"
	"reflect"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type CompareRiskCycleDetailsUseCase struct {
	riskRepo repository.RiskRepository
	orgSvc   *service.OrganizationHierarchy
}

func NewCompareRiskCycleDetailsUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *CompareRiskCycleDetailsUseCase {
	return &CompareRiskCycleDetailsUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type CompareRiskCycleDetailsInput struct {
	FromCycle     string
	ToCycle       string
	OrgID         *uuid.UUID
	IncludeStable bool
}

func (uc *CompareRiskCycleDetailsUseCase) Execute(ctx context.Context, input CompareRiskCycleDetailsInput) (*entity.RiskCycleDetailedComparisonReport, error) {
	if input.FromCycle == "" || input.ToCycle == "" {
		return nil, errors.ErrInvalidInput
	}

	var orgIDs []uuid.UUID
	var err error

	if input.OrgID != nil {
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *input.OrgID)
		if err != nil {
			return nil, err
		}
	}

	fromSnapshot, err := uc.riskRepo.ListCycleSnapshot(ctx, input.FromCycle, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load source risk snapshot")
	}
	toSnapshot, err := uc.riskRepo.ListCycleSnapshot(ctx, input.ToCycle, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load target risk snapshot")
	}

	fromMap := make(map[uuid.UUID]*entity.Risk, len(fromSnapshot))
	toMap := make(map[uuid.UUID]*entity.Risk, len(toSnapshot))
	groupIDs := make([]uuid.UUID, 0, len(fromSnapshot)+len(toSnapshot))
	seen := make(map[uuid.UUID]struct{}, len(fromSnapshot)+len(toSnapshot))

	for _, risk := range fromSnapshot {
		if risk == nil {
			continue
		}
		fromMap[risk.VersionGroupID] = risk
		if _, ok := seen[risk.VersionGroupID]; !ok {
			groupIDs = append(groupIDs, risk.VersionGroupID)
			seen[risk.VersionGroupID] = struct{}{}
		}
	}
	for _, risk := range toSnapshot {
		if risk == nil {
			continue
		}
		toMap[risk.VersionGroupID] = risk
		if _, ok := seen[risk.VersionGroupID]; !ok {
			groupIDs = append(groupIDs, risk.VersionGroupID)
			seen[risk.VersionGroupID] = struct{}{}
		}
	}

	sort.Slice(groupIDs, func(i, j int) bool {
		left := reportSortKey(fromMap[groupIDs[i]], toMap[groupIDs[i]])
		right := reportSortKey(fromMap[groupIDs[j]], toMap[groupIDs[j]])
		return left < right
	})

	report := &entity.RiskCycleDetailedComparisonReport{
		Summary: &entity.RiskCycleDetailedComparisonSummary{
			FromCycle: input.FromCycle,
			ToCycle:   input.ToCycle,
			TotalFrom: len(fromSnapshot),
			TotalTo:   len(toSnapshot),
		},
		Items: make([]*entity.RiskCycleDetailedComparisonItem, 0, len(groupIDs)),
	}

	for _, groupID := range groupIDs {
		fromRisk := fromMap[groupID]
		toRisk := toMap[groupID]
		item := buildDetailedComparisonItem(input.FromCycle, input.ToCycle, groupID, fromRisk, toRisk)

		switch item.ChangeCategory {
		case "added":
			report.Summary.AddedCount++
		case "removed":
			report.Summary.RemovedCount++
		case "changed":
			report.Summary.ChangedCount++
		case "stable":
			report.Summary.StableCount++
		}

		if item.ChangeCategory == "stable" && !input.IncludeStable {
			continue
		}
		report.Items = append(report.Items, item)
	}

	return report, nil
}

type fieldDescriptor struct {
	Name      string
	Label     string
	Extractor func(*entity.Risk) any
}

var riskFieldDescriptors = []fieldDescriptor{
	{Name: "code", Label: "Kode", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.Code) }},
	{Name: "title", Label: "Judul Risiko", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.Title) }},
	{Name: "category", Label: "Kategori Risiko", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.Category) }},
	{Name: "description", Label: "Deskripsi", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.Description) }},
	{Name: "orgName", Label: "Unit", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.OrgName) }},
	{Name: "cause", Label: "Penyebab", Extractor: func(r *entity.Risk) any { return normalizeStrings(r.Cause) }},
	{Name: "riskSource", Label: "Sumber Risiko", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.RiskSource) }},
	{Name: "controllability", Label: "Controllability", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.Controllability) }},
	{Name: "impactDesc", Label: "Dampak", Extractor: func(r *entity.Risk) any { return normalizeStrings(r.ImpactDesc) }},
	{Name: "existingControl", Label: "Existing Control", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.ExistingControl) }},
	{Name: "controlEffectiveness", Label: "Efektivitas Kontrol", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.ControlEffectiveness) }},
	{Name: "probability", Label: "Probabilitas", Extractor: func(r *entity.Risk) any { return r.Probability }},
	{Name: "impact", Label: "Dampak Skor", Extractor: func(r *entity.Risk) any { return r.Impact }},
	{Name: "inherentScore", Label: "Skor Inheren", Extractor: func(r *entity.Risk) any { return r.InherentScore }},
	{Name: "riskPriority", Label: "Prioritas Risiko", Extractor: func(r *entity.Risk) any { return r.RiskPriority }},
	{Name: "riskAppetite", Label: "Risk Appetite", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.RiskAppetite) }},
	{Name: "treatmentOption", Label: "Treatment Option", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.TreatmentOption) }},
	{Name: "targetProbability", Label: "Target Probabilitas", Extractor: func(r *entity.Risk) any { return r.TargetProbability }},
	{Name: "targetImpact", Label: "Target Dampak", Extractor: func(r *entity.Risk) any { return r.TargetImpact }},
	{Name: "targetScore", Label: "Target Score", Extractor: func(r *entity.Risk) any { return r.TargetScore }},
	{Name: "nextReviewDate", Label: "Next Review Date", Extractor: func(r *entity.Risk) any { return normalizeOptionalString(r.NextReviewDate) }},
	{Name: "changeReason", Label: "Alasan Perubahan", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.ChangeReason) }},
	{Name: "reviewSummary", Label: "Ringkasan Review", Extractor: func(r *entity.Risk) any { return strings.TrimSpace(r.ReviewSummary) }},
}

func buildDetailedComparisonItem(fromCycle string, toCycle string, groupID uuid.UUID, fromRisk *entity.Risk, toRisk *entity.Risk) *entity.RiskCycleDetailedComparisonItem {
	item := &entity.RiskCycleDetailedComparisonItem{
		VersionGroupID: groupID.String(),
		FromCycle:      fromCycle,
		ToCycle:        toCycle,
	}

	if fromRisk != nil {
		item.FromRiskID = fromRisk.ID.String()
		item.FromSnapshot = buildSideBySideSnapshot(fromRisk)
	}
	if toRisk != nil {
		item.ToRiskID = toRisk.ID.String()
		item.ToSnapshot = buildSideBySideSnapshot(toRisk)
		item.ChangeReason = strings.TrimSpace(toRisk.ChangeReason)
		item.ReviewSummary = strings.TrimSpace(toRisk.ReviewSummary)
	}

	base := toRisk
	if base == nil {
		base = fromRisk
	}
	if base != nil {
		item.Code = base.Code
		item.Title = base.Title
		item.OrgName = base.OrgName
	}

	switch {
	case fromRisk == nil && toRisk != nil:
		item.ChangeCategory = "added"
		item.FieldDiffs = diffFullRisk(nil, toRisk, "added")
		item.MitigationDiffs = diffMitigations(nil, toRisk.Mitigations)
	case fromRisk != nil && toRisk == nil:
		item.ChangeCategory = "removed"
		item.FieldDiffs = diffFullRisk(fromRisk, nil, "removed")
		item.MitigationDiffs = diffMitigations(fromRisk.Mitigations, nil)
	default:
		item.FieldDiffs = diffRiskFields(fromRisk, toRisk)
		item.MitigationDiffs = diffMitigations(fromRisk.Mitigations, toRisk.Mitigations)
		if len(item.FieldDiffs) == 0 && len(item.MitigationDiffs) == 0 {
			item.ChangeCategory = "stable"
		} else {
			item.ChangeCategory = "changed"
		}
	}

	return item
}

func diffRiskFields(fromRisk *entity.Risk, toRisk *entity.Risk) []*entity.RiskFieldDiff {
	diffs := make([]*entity.RiskFieldDiff, 0)
	for _, field := range riskFieldDescriptors {
		before := normalizeValue(field.Extractor(fromRisk))
		after := normalizeValue(field.Extractor(toRisk))
		if reflect.DeepEqual(before, after) {
			continue
		}
		diffs = append(diffs, &entity.RiskFieldDiff{
			Field:      field.Name,
			Label:      field.Label,
			Before:     before,
			After:      after,
			ChangeType: classifyChange(before, after),
		})
	}
	return diffs
}

func diffFullRisk(fromRisk *entity.Risk, toRisk *entity.Risk, changeType string) []*entity.RiskFieldDiff {
	diffs := make([]*entity.RiskFieldDiff, 0, len(riskFieldDescriptors))
	for _, field := range riskFieldDescriptors {
		var before any
		var after any
		if fromRisk != nil {
			before = normalizeValue(field.Extractor(fromRisk))
		}
		if toRisk != nil {
			after = normalizeValue(field.Extractor(toRisk))
		}
		diffs = append(diffs, &entity.RiskFieldDiff{
			Field:      field.Name,
			Label:      field.Label,
			Before:     before,
			After:      after,
			ChangeType: changeType,
		})
	}
	return diffs
}

type mitigationFieldDescriptor struct {
	Name      string
	Label     string
	Extractor func(entity.Mitigation) any
}

var mitigationFieldDescriptors = []mitigationFieldDescriptor{
	{Name: "action", Label: "Aksi Mitigasi", Extractor: func(m entity.Mitigation) any { return strings.TrimSpace(m.Action) }},
	{Name: "owner", Label: "PIC", Extractor: func(m entity.Mitigation) any { return strings.TrimSpace(m.Owner) }},
	{Name: "ownerUserId", Label: "Owner User", Extractor: func(m entity.Mitigation) any { return uuidString(m.OwnerUserID) }},
	{Name: "dueDate", Label: "Due Date", Extractor: func(m entity.Mitigation) any { return normalizeOptionalString(m.DueDate) }},
	{Name: "frequency", Label: "Frekuensi", Extractor: func(m entity.Mitigation) any { return strings.TrimSpace(m.Frequency) }},
	{Name: "recurringInterval", Label: "Interval", Extractor: func(m entity.Mitigation) any { return normalizeOptionalString(m.RecurringInterval) }},
	{Name: "reportDay", Label: "Hari Lapor", Extractor: func(m entity.Mitigation) any { return normalizeOptionalInt(m.ReportDay) }},
	{Name: "reportDate", Label: "Tanggal Lapor", Extractor: func(m entity.Mitigation) any { return normalizeOptionalInt(m.ReportDate) }},
	{Name: "executionScheduleText", Label: "Schedule Text", Extractor: func(m entity.Mitigation) any { return strings.TrimSpace(m.ExecutionScheduleText) }},
	{Name: "targetCost", Label: "Target Cost", Extractor: func(m entity.Mitigation) any { return m.TargetCost }},
}

func diffMitigations(fromMitigations []entity.Mitigation, toMitigations []entity.Mitigation) []*entity.RiskMitigationDiff {
	fromItems := indexedMitigations(fromMitigations)
	toItems := indexedMitigations(toMitigations)
	usedFrom := make([]bool, len(fromItems))
	usedTo := make([]bool, len(toItems))
	diffs := make([]*entity.RiskMitigationDiff, 0)

	appendPairDiff := func(fromItem *indexedMitigation, toItem *indexedMitigation) {
		rowKey := mitigationRowKey(fromItem, toItem)
		switch {
		case fromItem == nil && toItem != nil:
			diffs = append(diffs, &entity.RiskMitigationDiff{
				RowKey:     rowKey,
				ChangeType: "added",
				FieldDiffs: diffFullMitigation(nil, &toItem.Mitigation, "added"),
				AfterLabel: strings.TrimSpace(toItem.Action),
			})
		case fromItem != nil && toItem == nil:
			diffs = append(diffs, &entity.RiskMitigationDiff{
				RowKey:      rowKey,
				ChangeType:  "removed",
				FieldDiffs:  diffFullMitigation(&fromItem.Mitigation, nil, "removed"),
				BeforeLabel: strings.TrimSpace(fromItem.Action),
			})
		case fromItem != nil && toItem != nil:
			fieldDiffs := diffMitigationFields(fromItem.Mitigation, toItem.Mitigation)
			if len(fieldDiffs) == 0 {
				return
			}
			diffs = append(diffs, &entity.RiskMitigationDiff{
				RowKey:      rowKey,
				ChangeType:  "modified",
				FieldDiffs:  fieldDiffs,
				BeforeLabel: strings.TrimSpace(fromItem.Action),
				AfterLabel:  strings.TrimSpace(toItem.Action),
			})
		}
	}

	match := func(equal func(indexedMitigation, indexedMitigation) bool) {
		for fromIndex, fromItem := range fromItems {
			if usedFrom[fromIndex] {
				continue
			}
			for toIndex, toItem := range toItems {
				if usedTo[toIndex] || !equal(fromItem, toItem) {
					continue
				}
				usedFrom[fromIndex] = true
				usedTo[toIndex] = true
				appendPairDiff(&fromItem, &toItem)
				break
			}
		}
	}

	match(func(fromItem indexedMitigation, toItem indexedMitigation) bool {
		return mitigationFullFingerprint(fromItem.Mitigation) == mitigationFullFingerprint(toItem.Mitigation)
	})
	match(func(fromItem indexedMitigation, toItem indexedMitigation) bool {
		return mitigationActionFingerprint(fromItem.Mitigation) != "" && mitigationActionFingerprint(fromItem.Mitigation) == mitigationActionFingerprint(toItem.Mitigation)
	})
	match(func(fromItem indexedMitigation, toItem indexedMitigation) bool {
		return fromItem.Key == toItem.Key
	})

	for fromIndex := range fromItems {
		if !usedFrom[fromIndex] {
			appendPairDiff(&fromItems[fromIndex], nil)
		}
	}
	for toIndex := range toItems {
		if !usedTo[toIndex] {
			appendPairDiff(nil, &toItems[toIndex])
		}
	}

	sort.Slice(diffs, func(i, j int) bool {
		return diffs[i].RowKey < diffs[j].RowKey
	})
	return diffs
}

type indexedMitigation struct {
	entity.Mitigation
	Key int
}

func indexedMitigations(items []entity.Mitigation) []indexedMitigation {
	result := make([]indexedMitigation, 0, len(items))
	for index, item := range items {
		key := item.SortOrder
		if key <= 0 {
			key = index + 1
		}
		result = append(result, indexedMitigation{Mitigation: item, Key: key})
	}
	return result
}

func mitigationRowKey(fromItem *indexedMitigation, toItem *indexedMitigation) string {
	if fromItem != nil {
		return fmt.Sprintf("%02d-%s", fromItem.Key, mitigationActionFingerprint(fromItem.Mitigation))
	}
	if toItem != nil {
		return fmt.Sprintf("%02d-%s", toItem.Key, mitigationActionFingerprint(toItem.Mitigation))
	}
	return ""
}

func mitigationActionFingerprint(item entity.Mitigation) string {
	return strings.TrimSpace(strings.ToLower(item.Action))
}

func mitigationFullFingerprint(item entity.Mitigation) string {
	return strings.Join([]string{
		mitigationActionFingerprint(item),
		strings.TrimSpace(strings.ToLower(item.Owner)),
		normalizedStringValue(normalizeOptionalString(item.DueDate)),
		strings.TrimSpace(strings.ToLower(item.Frequency)),
		normalizedStringValue(normalizeOptionalString(item.RecurringInterval)),
		normalizedStringValue(normalizeOptionalInt(item.ReportDay)),
		normalizedStringValue(normalizeOptionalInt(item.ReportDate)),
		strings.TrimSpace(strings.ToLower(item.ExecutionScheduleText)),
		normalizedStringValue(item.TargetCost),
	}, "|")
}

func diffMitigationFields(fromMit entity.Mitigation, toMit entity.Mitigation) []*entity.RiskFieldDiff {
	diffs := make([]*entity.RiskFieldDiff, 0)
	for _, field := range mitigationFieldDescriptors {
		before := normalizeValue(field.Extractor(fromMit))
		after := normalizeValue(field.Extractor(toMit))
		if reflect.DeepEqual(before, after) {
			continue
		}
		diffs = append(diffs, &entity.RiskFieldDiff{
			Field:      field.Name,
			Label:      field.Label,
			Before:     before,
			After:      after,
			ChangeType: classifyChange(before, after),
		})
	}
	return diffs
}

func diffFullMitigation(fromMit *entity.Mitigation, toMit *entity.Mitigation, changeType string) []*entity.RiskFieldDiff {
	diffs := make([]*entity.RiskFieldDiff, 0, len(mitigationFieldDescriptors))
	for _, field := range mitigationFieldDescriptors {
		var before any
		var after any
		if fromMit != nil {
			before = normalizeValue(field.Extractor(*fromMit))
		}
		if toMit != nil {
			after = normalizeValue(field.Extractor(*toMit))
		}
		diffs = append(diffs, &entity.RiskFieldDiff{
			Field:      field.Name,
			Label:      field.Label,
			Before:     before,
			After:      after,
			ChangeType: changeType,
		})
	}
	return diffs
}

func normalizeValue(value any) any {
	switch v := value.(type) {
	case nil:
		return nil
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return nil
		}
		return trimmed
	case []string:
		if len(v) == 0 {
			return nil
		}
		return normalizeStrings(v)
	default:
		return value
	}
}

func classifyChange(before any, after any) string {
	if before == nil && after != nil {
		return "added"
	}
	if before != nil && after == nil {
		return "removed"
	}
	return "modified"
}

func normalizeStrings(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	if len(result) == 0 {
		return nil
	}
	return result
}

func normalizeOptionalString(value *string) any {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func normalizeOptionalInt(value *int) any {
	if value == nil {
		return nil
	}
	return *value
}

func normalizedStringValue(value any) string {
	if value == nil {
		return ""
	}
	return fmt.Sprintf("%v", value)
}

func buildSideBySideSnapshot(risk *entity.Risk) *entity.RiskCycleSideBySideSnapshot {
	if risk == nil {
		return nil
	}
	return &entity.RiskCycleSideBySideSnapshot{
		Category:          strings.TrimSpace(risk.Category),
		Description:       strings.TrimSpace(risk.Description),
		Cause:             normalizeStrings(risk.Cause),
		ExistingControl:   strings.TrimSpace(risk.ExistingControl),
		Probability:       risk.Probability,
		Impact:            risk.Impact,
		InherentScore:     risk.InherentScore,
		RiskPriority:      risk.RiskPriority,
		TreatmentOption:   strings.TrimSpace(risk.TreatmentOption),
		TargetProbability: risk.TargetProbability,
		TargetImpact:      risk.TargetImpact,
		TargetScore:       risk.TargetScore,
		NextReviewDate:    normalizedStringValue(normalizeOptionalString(risk.NextReviewDate)),
		Mitigations:       mitigationSummaries(risk.Mitigations),
	}
}

func mitigationSummaries(items []entity.Mitigation) []string {
	if len(items) == 0 {
		return nil
	}
	result := make([]string, 0, len(items))
	for index, item := range items {
		parts := []string{fmt.Sprintf("%d. %s", index+1, strings.TrimSpace(item.Action))}
		if owner := strings.TrimSpace(item.Owner); owner != "" {
			parts = append(parts, fmt.Sprintf("PIC: %s", owner))
		}
		if frequency := strings.TrimSpace(item.Frequency); frequency != "" {
			parts = append(parts, fmt.Sprintf("Frek: %s", frequency))
		}
		result = append(result, strings.Join(parts, " | "))
	}
	return result
}

func uuidString(value *uuid.UUID) any {
	if value == nil {
		return nil
	}
	return value.String()
}

func reportSortKey(fromRisk *entity.Risk, toRisk *entity.Risk) string {
	base := toRisk
	if base == nil {
		base = fromRisk
	}
	if base == nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(base.Code) + "|" + strings.TrimSpace(base.Title))
}
