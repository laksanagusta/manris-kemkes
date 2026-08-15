package riskcascade

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

func currentAssessmentCycle() string {
	now := time.Now().UTC()
	quarter := (int(now.Month())-1)/3 + 1
	return fmt.Sprintf("%d-Q%d", now.Year(), quarter)
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
