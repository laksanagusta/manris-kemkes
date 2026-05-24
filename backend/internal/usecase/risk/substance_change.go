package risk

import (
	"reflect"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type SubstanceChange struct {
	Field string `json:"field"`
	Label string `json:"label"`
}

func DetectSubstanceChanges(previous, candidate *entity.Risk) []SubstanceChange {
	if previous == nil || candidate == nil {
		return nil
	}

	changes := make([]SubstanceChange, 0, 12)

	appendChange := func(field, label string, changed bool) {
		if changed {
			changes = append(changes, SubstanceChange{Field: field, Label: label})
		}
	}

	appendChange("title", "Judul Risiko", trim(previous.Title) != trim(candidate.Title))
	appendChange("description", "Deskripsi Risiko", trim(previous.Description) != trim(candidate.Description))
	appendChange("category", "Kategori Risiko", trim(previous.Category) != trim(candidate.Category))
	appendChange("cause", "Penyebab", !stringSlicesEqual(previous.Cause, candidate.Cause))
	appendChange("riskSource", "Sumber Risiko", trim(previous.RiskSource) != trim(candidate.RiskSource))
	appendChange("controllability", "Controllability", trim(previous.Controllability) != trim(candidate.Controllability))
	appendChange("impactDesc", "Uraian Dampak", !stringSlicesEqual(previous.ImpactDesc, candidate.ImpactDesc))
	appendChange("existingControl", "Kontrol Eksisting", trim(previous.ExistingControl) != trim(candidate.ExistingControl))
	appendChange("controlEffectiveness", "Efektivitas Kontrol", trim(previous.ControlEffectiveness) != trim(candidate.ControlEffectiveness))
	appendChange("treatmentOption", "Opsi Penanganan", trim(previous.TreatmentOption) != trim(candidate.TreatmentOption))
	appendChange("riskOwnerId", "Pemilik Risiko", !uuidPtrEqual(previous.RiskOwnerID, candidate.RiskOwnerID))
	appendChange("controlOwnerId", "Pemilik Kontrol", !uuidPtrEqual(previous.ControlOwnerID, candidate.ControlOwnerID))
	appendChange("mitigations", "Rencana Penanganan", !mitigationsEqual(previous.Mitigations, candidate.Mitigations))

	return changes
}

func BuildSubstanceChangeWarnings(previous, candidate *entity.Risk) []string {
	if previous == nil || candidate == nil {
		return nil
	}

	changedTitle := trim(previous.Title) != trim(candidate.Title)
	changedDescription := trim(previous.Description) != trim(candidate.Description)
	changedSource := trim(previous.RiskSource) != trim(candidate.RiskSource)
	changedOwner := !uuidPtrEqual(previous.RiskOwnerID, candidate.RiskOwnerID)

	if changedTitle && changedDescription && changedSource && changedOwner {
		return []string{
			"Perubahan judul, deskripsi, sumber risiko, dan pemilik risiko sekaligus dapat menandakan risiko baru. Pastikan objek risiko masih sama sebelum diajukan.",
		}
	}

	return nil
}

func trim(value string) string {
	return strings.TrimSpace(value)
}

func stringSlicesEqual(a, b []string) bool {
	normalize := func(values []string) []string {
		out := make([]string, 0, len(values))
		for _, value := range values {
			value = trim(value)
			if value != "" {
				out = append(out, value)
			}
		}
		return out
	}

	return reflect.DeepEqual(normalize(a), normalize(b))
}

func uuidPtrEqual(a, b *uuid.UUID) bool {
	switch {
	case a == nil && b == nil:
		return true
	case a == nil || b == nil:
		return false
	default:
		return *a == *b
	}
}

func mitigationsEqual(a, b []entity.Mitigation) bool {
	normalize := func(items []entity.Mitigation) []normalizedMitigation {
		out := make([]normalizedMitigation, 0, len(items))
		for _, item := range items {
			out = append(out, normalizedMitigation{
				Action:                 trim(item.Action),
				Owner:                  trim(item.Owner),
				DueDate:                normalizeStringPtr(item.DueDate),
				Frequency:              trim(item.Frequency),
				RecurringInterval:      normalizeStringPtr(item.RecurringInterval),
				ExecutionScheduleText:  trim(item.ExecutionScheduleText),
				MitigationType:         trim(item.MitigationType),
				ActivityStage:          trim(item.ActivityStage),
				ExpectedOutput:         trim(item.ExpectedOutput),
				QuantitativeTarget:     trim(item.QuantitativeTarget),
				SupportingUnit:         trim(item.SupportingUnit),
				ResourcesRequired:      trim(item.ResourcesRequired),
				ContingencyPlan:        trim(item.ContingencyPlan),
				PotentialObstacle:      trim(item.PotentialObstacle),
				CostBenefitNote:        trim(item.CostBenefitNote),
				IsBreakthroughActivity: item.IsBreakthroughActivity,
				IsExistingControl:      item.IsExistingControl,
			})
		}
		return out
	}

	return reflect.DeepEqual(normalize(a), normalize(b))
}

type normalizedMitigation struct {
	Action                 string
	Owner                  string
	DueDate                string
	Frequency              string
	RecurringInterval      string
	ExecutionScheduleText  string
	MitigationType         string
	ActivityStage          string
	ExpectedOutput         string
	QuantitativeTarget     string
	SupportingUnit         string
	ResourcesRequired      string
	ContingencyPlan        string
	PotentialObstacle      string
	CostBenefitNote        string
	IsBreakthroughActivity bool
	IsExistingControl      bool
}

func normalizeStringPtr(value *string) string {
	if value == nil {
		return ""
	}
	return trim(*value)
}
