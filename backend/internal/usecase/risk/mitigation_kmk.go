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
	m.CostBenefitNote = strings.TrimSpace(m.CostBenefitNote)
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
