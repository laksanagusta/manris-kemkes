package riskcascade

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/timeutil"
)

func currentAssessmentCycle() string {
	now := timeutil.BusinessNow().In(timeutil.JakartaLocation())
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
