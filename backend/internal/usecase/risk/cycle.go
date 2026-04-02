package risk

import (
	"fmt"
	"time"
)

func currentAssessmentCycle() string {
	now := time.Now()
	half := "H1"
	if now.Month() >= time.July {
		half = "H2"
	}
	return fmt.Sprintf("%d-%s", now.Year(), half)
}
