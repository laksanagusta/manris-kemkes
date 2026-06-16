package risk

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	apperrors "github.com/manris/backend/internal/domain/errors"
)

var cycleFormatRe = regexp.MustCompile(`^\d{4}-Q[1-4]$`)
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
	return cycleFormatRe.MatchString(cycle)
}

func IsValidSemesterFormat(cycle string) bool {
	return semesterFormatRe.MatchString(cycle)
}

func IsValidAnyCycleFormat(cycle string) bool {
	return cycleFormatRe.MatchString(cycle) || semesterFormatRe.MatchString(cycle)
}

func CycleIndex(cycle string) (int, error) {
	if !IsValidAnyCycleFormat(cycle) {
		return 0, apperrors.ErrAnyCycleFormat
	}

	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "tahun dalam assessment_cycle tidak valid")
	}

	if cycleFormatRe.MatchString(cycle) {
		quarter, err := strconv.Atoi(cycle[6:])
		if err != nil {
			return 0, apperrors.Wrap(apperrors.ErrInvalidInput, "kuartal dalam assessment_cycle tidak valid")
		}
		return year*4 + (quarter - 1), nil
	}

	half := strings.ToUpper(cycle[5:])
	switch half {
	case "H1":
		return year*4 + 1, nil
	case "H2":
		return year*4 + 3, nil
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

func SemesterToTargetQuarter(semesterCycle string) (string, error) {
	if !IsValidSemesterFormat(semesterCycle) {
		return "", apperrors.ErrSemesterFormat
	}

	year := semesterCycle[:4]
	half := strings.ToUpper(semesterCycle[5:])

	switch half {
	case "H1":
		return fmt.Sprintf("%s-Q2", year), nil
	case "H2":
		return fmt.Sprintf("%s-Q4", year), nil
	default:
		return "", apperrors.Wrap(apperrors.ErrInvalidInput, "setengah tahun dalam assessment_cycle tidak valid")
	}
}

func QuarterToAssessmentSemester(quarterCycle string) (string, error) {
	if !IsValidCycleFormat(quarterCycle) {
		return "", apperrors.ErrCycleFormat
	}

	year := quarterCycle[:4]
	quarter := strings.ToUpper(quarterCycle[6:])

	switch quarter {
	case "1", "2":
		return fmt.Sprintf("%s-H1", year), nil
	case "3", "4":
		return fmt.Sprintf("%s-H2", year), nil
	default:
		return "", apperrors.Wrap(apperrors.ErrInvalidInput, "kuartal dalam assessment_cycle tidak valid")
	}
}
