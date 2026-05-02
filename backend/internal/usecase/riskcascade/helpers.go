package riskcascade

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

func currentAssessmentCycle() string {
	now := time.Now().UTC()
	half := "H1"
	if now.Month() >= time.July {
		half = "H2"
	}
	return fmt.Sprintf("%d-%s", now.Year(), half)
}

func isOrgAccessible(orgID uuid.UUID, allowed []uuid.UUID) bool {
	if len(allowed) == 0 {
		return true
	}
	for _, id := range allowed {
		if id == orgID {
			return true
		}
	}
	return false
}
