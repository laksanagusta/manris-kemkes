package risk

import (
	"fmt"
	"regexp"
	"time"
)

var cycleFormatRe = regexp.MustCompile(`^\d{4}-H[12]$`)

func currentAssessmentCycle() string {
	now := time.Now()
	half := "H1"
	if now.Month() >= time.July {
		half = "H2"
	}
	return fmt.Sprintf("%d-%s", now.Year(), half)
}

// IsValidCycleFormat checks that a cycle string matches the YYYY-HN pattern (e.g. "2026-H1").
func IsValidCycleFormat(cycle string) bool {
	return cycleFormatRe.MatchString(cycle)
}
