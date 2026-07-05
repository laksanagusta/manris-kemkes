package risk

import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	apperrors "github.com/manris/backend/internal/domain/errors"
)

var semesterFormatRe = regexp.MustCompile(`^\d{4}-H[12]$`)

func currentAssessmentCycle() string {
	now := time.Now()
	half := "H1"
	if now.Month() >= time.July {
		half = "H2"
	}
	return fmt.Sprintf("%d-%s", now.Year(), half)
}

func IsValidCycleFormat(cycle string) bool {
	return semesterFormatRe.MatchString(cycle)
}

func IsValidSemesterFormat(cycle string) bool {
	return semesterFormatRe.MatchString(cycle)
}

func CycleIndex(cycle string) (int, error) {
	if !IsValidCycleFormat(cycle) {
		return 0, apperrors.ErrSemesterFormat
	}

	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "tahun dalam assessment_cycle tidak valid")
	}

	switch cycle[5:] {
	case "H1":
		return year * 2, nil
	case "H2":
		return year*2 + 1, nil
	default:
		return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "setengah tahun dalam assessment_cycle tidak valid")
	}
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

func NextSemesterCycle(cycle string) (string, error) {
	if !IsValidCycleFormat(cycle) {
		return "", apperrors.ErrSemesterFormat
	}

	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return "", apperrors.ErrSemesterFormat
	}
	switch cycle[5:] {
	case "H1":
		return fmt.Sprintf("%d-H2", year), nil
	case "H2":
		return fmt.Sprintf("%d-H1", year+1), nil
	default:
		return "", apperrors.ErrSemesterFormat
	}
}
