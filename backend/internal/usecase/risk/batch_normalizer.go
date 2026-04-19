package risk

import "strings"

func normalizeTreatmentOption(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "avoid", "hindari", "menghindari", "menghindari risiko":
		return "avoid"
	case "transfer", "berbagi", "berbagi risiko":
		return "transfer"
	case "mitigate", "mitigasi", "mitigasi risiko":
		return "mitigate"
	case "accept", "terima", "menerima", "menerima risiko":
		return "accept"
	default:
		return strings.TrimSpace(strings.ToLower(value))
	}
}

func normalizeControllability(value string) string {
	v := strings.ToUpper(strings.TrimSpace(value))
	if v == "C" || v == "UC" {
		return v
	}
	return strings.TrimSpace(value)
}

func normalizeControlEffectiveness(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "efektif":
		return "efektif"
	case "tidak efektif", "tidak_efektif":
		return "tidak_efektif"
	case "":
		return ""
	default:
		return strings.TrimSpace(strings.ToLower(value))
	}
}
