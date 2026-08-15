package risk

import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	apperrors "github.com/manris/backend/internal/domain/errors"
)

var quarterFormatRe = regexp.MustCompile(`^\d{4}-Q[1-4]$`)

func currentAssessmentCycle() string {
	now := time.Now()
	quarter := int(now.Month()-1)/3 + 1
	return fmt.Sprintf("%d-Q%d", now.Year(), quarter)
}

func IsValidCycleFormat(cycle string) bool {
	return quarterFormatRe.MatchString(cycle)
}

func IsValidQuarterFormat(cycle string) bool {
	return quarterFormatRe.MatchString(cycle)
}

// IsValidSemesterFormat is retained as a compatibility name. New risk and
// monitoring writes must use quarterly cycles.
func IsValidSemesterFormat(cycle string) bool {
	return IsValidCycleFormat(cycle)
}

func CycleIndex(cycle string) (int, error) {
	if !IsValidCycleFormat(cycle) {
		return 0, apperrors.ErrCycleFormat
	}

	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "tahun dalam assessment_cycle tidak valid")
	}

	quarter, err := strconv.Atoi(cycle[6:])
	if err != nil || quarter < 1 || quarter > 4 {
		return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "kuartal dalam assessment_cycle tidak valid")
	}
	return year*4 + quarter - 1, nil
}

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

func NextQuarterCycle(cycle string) (string, error) {
	if !IsValidCycleFormat(cycle) {
		return "", apperrors.ErrCycleFormat
	}

	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return "", apperrors.ErrCycleFormat
	}
	quarter, err := strconv.Atoi(cycle[6:])
	if err != nil || quarter < 1 || quarter > 4 {
		return "", apperrors.ErrCycleFormat
	}
	if quarter == 4 {
		return fmt.Sprintf("%d-Q1", year+1), nil
	}
	return fmt.Sprintf("%d-Q%d", year, quarter+1), nil
}

// PreviousQuarterCycle returns the immediately preceding quarterly period.
// Q1 correctly rolls back to Q4 of the previous year.
func PreviousQuarterCycle(cycle string) (string, error) {
	if !IsValidCycleFormat(cycle) {
		return "", apperrors.ErrCycleFormat
	}

	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return "", apperrors.ErrCycleFormat
	}
	quarter, err := strconv.Atoi(cycle[6:])
	if err != nil || quarter < 1 || quarter > 4 {
		return "", apperrors.ErrCycleFormat
	}
	if quarter == 1 {
		return fmt.Sprintf("%d-Q4", year-1), nil
	}
	return fmt.Sprintf("%d-Q%d", year, quarter-1), nil
}

func CycleYear(cycle string) (int, error) {
	if !IsValidCycleFormat(cycle) {
		return 0, apperrors.ErrCycleFormat
	}
	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return 0, apperrors.ErrCycleFormat
	}
	return year, nil
}

func CycleStartDate(cycle string) (time.Time, error) {
	year, err := CycleYear(cycle)
	if err != nil {
		return time.Time{}, err
	}
	quarter, err := strconv.Atoi(cycle[6:])
	if err != nil || quarter < 1 || quarter > 4 {
		return time.Time{}, apperrors.ErrCycleFormat
	}
	return time.Date(year, time.Month((quarter-1)*3+1), 1, 0, 0, 0, 0, time.UTC), nil
}

// NextSemesterCycle is retained for compatibility with older callers.
func NextSemesterCycle(cycle string) (string, error) {
	return NextQuarterCycle(cycle)
}
