package risk

import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	apperrors "github.com/manris/backend/internal/domain/errors"
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

// CycleIndex converts YYYY-HN into a sortable index.
func CycleIndex(cycle string) (int, error) {
	if !IsValidCycleFormat(cycle) {
		return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "assessment_cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}

	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "invalid assessment_cycle year")
	}

	half := 0
	switch cycle[5:] {
	case "H1":
		half = 0
	case "H2":
		half = 1
	default:
		return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "invalid assessment_cycle half")
	}

	return year*2 + half, nil
}

// CompareCycles compares two assessment cycles.
// Returns 1 if a>b, -1 if a<b, 0 if equal.
func CompareCycles(a string, b string) (int, error) {
	aIndex, err := CycleIndex(a)
	if err != nil {
		return 0, err
	}
	bIndex, err := CycleIndex(b)
	if err != nil {
		return 0, err
	}

	switch {
	case aIndex > bIndex:
		return 1, nil
	case aIndex < bIndex:
		return -1, nil
	default:
		return 0, nil
	}
}
