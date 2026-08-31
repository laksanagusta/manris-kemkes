package risk

import (
	"strings"

	"github.com/manris/backend/internal/domain/entity"
	apperrors "github.com/manris/backend/internal/domain/errors"
)

func normalizeMitigationKMKFields(m *entity.Mitigation) {
	if m == nil {
		return
	}
	m.Action = strings.TrimSpace(m.Action)
	m.Owner = strings.TrimSpace(m.Owner)
	m.MitigationType = entity.NormalizeMitigationType(m.MitigationType)
	m.ActivityStage = strings.TrimSpace(m.ActivityStage)
	m.ExpectedOutput = strings.TrimSpace(m.ExpectedOutput)
	m.QuantitativeTarget = strings.TrimSpace(m.QuantitativeTarget)
	m.SupportingUnit = strings.TrimSpace(m.SupportingUnit)
	m.ResourcesRequired = strings.TrimSpace(m.ResourcesRequired)
	m.ContingencyPlan = strings.TrimSpace(m.ContingencyPlan)
	m.PotentialObstacle = strings.TrimSpace(m.PotentialObstacle)
}

func pruneEmptyMitigations(mitigations []entity.Mitigation) []entity.Mitigation {
	if len(mitigations) == 0 {
		return nil
	}

	pruned := make([]entity.Mitigation, 0, len(mitigations))
	for _, mitigation := range mitigations {
		normalizeMitigationKMKFields(&mitigation)
		if mitigationHasContent(mitigation) {
			pruned = append(pruned, mitigation)
		}
	}

	return pruned
}

func mitigationHasContent(m entity.Mitigation) bool {
	if strings.TrimSpace(m.Action) != "" {
		return true
	}
	if strings.TrimSpace(m.Owner) != "" {
		return true
	}
	if m.OwnerUserID != nil || m.DueDate != nil {
		return true
	}
	if strings.TrimSpace(m.Frequency) != "" || m.RecurringInterval != nil {
		return true
	}
	if m.ReportDay != nil || m.ReportDate != nil {
		return true
	}
	if strings.TrimSpace(m.ExecutionScheduleText) != "" {
		return true
	}
	if m.TargetCost != 0 {
		return true
	}
	if strings.TrimSpace(m.ActivityStage) != "" ||
		strings.TrimSpace(m.ExpectedOutput) != "" ||
		strings.TrimSpace(m.QuantitativeTarget) != "" ||
		strings.TrimSpace(m.SupportingUnit) != "" ||
		strings.TrimSpace(m.ResourcesRequired) != "" ||
		strings.TrimSpace(m.ContingencyPlan) != "" ||
		strings.TrimSpace(m.PotentialObstacle) != "" {
		return true
	}
	if m.IsBreakthroughActivity || m.IsExistingControl {
		return true
	}

	return false
}

func requiresNewMitigationPlan(option string) bool {
	switch strings.TrimSpace(strings.ToLower(option)) {
	case "mitigate", "mitigasi", "mitigasi risiko", "mitigate risiko":
		return true
	default:
		return false
	}
}

func validateRiskMitigationRequirements(risk *entity.Risk) error {
	if risk == nil {
		return nil
	}
	if !risk.IsRiskUtama() || !requiresNewMitigationPlan(risk.TreatmentOption) {
		return nil
	}
	for _, mitigation := range risk.Mitigations {
		if !mitigation.IsExistingControl {
			return nil
		}
	}
	return apperrors.Wrap(apperrors.ErrInvalidInput, "risk utama with treatment mitigasi requires at least one new mitigation plan")
}
