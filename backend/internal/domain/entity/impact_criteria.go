package entity

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ImpactCriteria represents a row in the KMK impact criteria matrix (kmk.md Tabel 2).
// Each criteria maps a risk category + UPR level + impact level to a description.
type ImpactCriteria struct {
	ID           uuid.UUID `json:"id"`
	Category     string    `json:"category"`
	UPRLevel     string    `json:"uprLevel"`
	ImpactLevel  int       `json:"impactLevel"`
	ImpactLabel  string    `json:"impactLabel"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"createdAt"`
}

// Validate checks field constraints per KMK.
func (i ImpactCriteria) Validate() error {
	switch i.Category {
	case "kebijakan", "reputasi", "fraud_korupsi", "legal", "kepatuhan", "operasional":
	default:
		return fmt.Errorf("invalid category: %q", i.Category)
	}
	switch i.UPRLevel {
	case "kementerian", "upr_t1", "upr_t2":
	default:
		return fmt.Errorf("invalid upr level: %q", i.UPRLevel)
	}
	if i.ImpactLevel < 1 || i.ImpactLevel > 5 {
		return fmt.Errorf("impact level must be between 1 and 5, got %d", i.ImpactLevel)
	}
	if i.ImpactLabel == "" {
		return fmt.Errorf("impact label is required")
	}
	if i.Description == "" {
		return fmt.Errorf("description is required")
	}
	return nil
}

// ImpactLevelLabels maps KMK impact levels to Indonesian labels.
var ImpactLevelLabels = map[int]string{
	1: "Tidak Signifikan",
	2: "Kecil",
	3: "Sedang",
	4: "Besar",
	5: "Katastropik",
}

// GetImpactLabel returns the label for a given impact level.
func GetImpactLabel(level int) string {
	if label, ok := ImpactLevelLabels[level]; ok {
		return label
	}
	return ""
}

// ValidCategories returns all valid risk categories per KMK.
func ValidImpactCategories() []string {
	return []string{"kebijakan", "reputasi", "fraud_korupsi", "legal", "kepatuhan", "operasional"}
}

// ValidUPRLevels returns all valid UPR levels per KMK.
func ValidUPRLevels() []string {
	return []string{"kementerian", "upr_t1", "upr_t2"}
}