package ai

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

const defaultTranscriptMitigationOwner = "Belum ditentukan"

type ApplyTranscriptRiskChangesUseCase struct {
	riskRepo repository.RiskRepository
}

func NewApplyTranscriptRiskChangesUseCase(riskRepo repository.RiskRepository) *ApplyTranscriptRiskChangesUseCase {
	return &ApplyTranscriptRiskChangesUseCase{riskRepo: riskRepo}
}

type ApplyTranscriptRiskChangesInput struct {
	TargetRiskID    uuid.UUID
	ActorID         uuid.UUID
	ActorRole       string
	SelectedChanges []entity.TranscriptRiskChange
}

type ApplyTranscriptRiskChangesOutput struct {
	RiskID            uuid.UUID `json:"riskId"`
	RiskCode          string    `json:"riskCode"`
	Status            string    `json:"status"`
	CreatedNewVersion bool      `json:"createdNewVersion"`
}

func (uc *ApplyTranscriptRiskChangesUseCase) Execute(ctx context.Context, input ApplyTranscriptRiskChangesInput) (*ApplyTranscriptRiskChangesOutput, error) {
	if input.TargetRiskID == uuid.Nil || len(input.SelectedChanges) == 0 {
		return nil, errors.ErrInvalidInput
	}
	if input.ActorRole != "unit" && input.ActorRole != "superadmin" {
		return nil, errors.ErrForbidden
	}

	existingRisk, err := uc.riskRepo.GetByID(ctx, input.TargetRiskID)
	if err != nil {
		return nil, err
	}
	if !existingRisk.IsCurrent {
		return nil, errors.ErrRiskNotFound
	}

	if existingRisk.Status == "draft" {
		nextRisk := cloneRisk(existingRisk)
		if err := applyTranscriptChanges(nextRisk, input.SelectedChanges); err != nil {
			return nil, err
		}
		if err := nextRisk.Validate(); err != nil {
			return nil, err
		}
		if err := uc.riskRepo.Update(ctx, nextRisk); err != nil {
			return nil, errors.Wrap(err, "failed to update risk from transcript")
		}
		return &ApplyTranscriptRiskChangesOutput{
			RiskID:            nextRisk.ID,
			RiskCode:          nextRisk.Code,
			Status:            nextRisk.Status,
			CreatedNewVersion: false,
		}, nil
	}

	if existingRisk.IsLocked() {
		now := time.Now()
		archivedRisk := cloneRisk(existingRisk)
		archivedRisk.IsCurrent = false
		archivedRisk.ArchivedAt = &now
		archivedRisk.ArchivedReason = "superseded_by_transcript_apply"

		if err := uc.riskRepo.Update(ctx, archivedRisk); err != nil {
			return nil, errors.Wrap(err, "failed to archive previous risk version")
		}

		nextRisk := cloneRisk(existingRisk)
		nextRisk.ID = uuid.New()
		nextRisk.Status = "draft"
		nextRisk.PreviousRiskID = &existingRisk.ID
		nextRisk.IsCurrent = true
		nextRisk.ArchivedAt = nil
		nextRisk.ArchivedReason = ""
		if input.ActorID != uuid.Nil {
			actorID := input.ActorID
			nextRisk.CreatedBy = &actorID
		}

		if err := applyTranscriptChanges(nextRisk, input.SelectedChanges); err != nil {
			return nil, err
		}
		if err := nextRisk.Validate(); err != nil {
			return nil, err
		}
		if err := uc.riskRepo.Create(ctx, nextRisk); err != nil {
			return nil, errors.Wrap(err, "failed to create updated risk version")
		}

		return &ApplyTranscriptRiskChangesOutput{
			RiskID:            nextRisk.ID,
			RiskCode:          nextRisk.Code,
			Status:            nextRisk.Status,
			CreatedNewVersion: true,
		}, nil
	}

	return nil, errors.ErrInvalidStatus
}

func applyTranscriptChanges(risk *entity.Risk, changes []entity.TranscriptRiskChange) error {
	for _, change := range changes {
		switch change.Field {
		case "description":
			value, ok, err := readOptionalStringValue(change.Value)
			if err != nil {
				return errors.Wrap(err, "invalid description change")
			}
			if ok {
				risk.Description = value
			}
		case "existingControl":
			value, ok, err := readOptionalStringValue(change.Value)
			if err != nil {
				return errors.Wrap(err, "invalid existing control change")
			}
			if ok {
				risk.ExistingControl = value
			}
		case "treatmentOption":
			value, ok, err := readOptionalStringValue(change.Value)
			if err != nil {
				return errors.Wrap(err, "invalid treatment option change")
			}
			if ok {
				risk.TreatmentOption = value
			}
		case "probability":
			value, ok, err := readOptionalIntValue(change.Value)
			if err != nil {
				return errors.Wrap(err, "invalid probability change")
			}
			if ok {
				risk.Probability = value
			}
		case "impact":
			value, ok, err := readOptionalIntValue(change.Value)
			if err != nil {
				return errors.Wrap(err, "invalid impact change")
			}
			if ok {
				risk.Impact = value
			}
		case "cause":
			values, err := readStringListValue(change.Value)
			if err != nil {
				return errors.Wrap(err, "invalid cause change")
			}
			if len(values) > 0 {
				risk.Cause = appendUniqueStrings(risk.Cause, values...)
			}
		case "impactDesc":
			values, err := readStringListValue(change.Value)
			if err != nil {
				return errors.Wrap(err, "invalid impact description change")
			}
			if len(values) > 0 {
				risk.ImpactDesc = appendUniqueStrings(risk.ImpactDesc, values...)
			}
		case "mitigations":
			mitigation, err := readMitigationValue(change.Value)
			if err != nil {
				return errors.Wrap(err, "invalid mitigation change")
			}
			mitigation.RiskID = risk.ID
			mitigation.SortOrder = len(risk.Mitigations) + 1
			risk.Mitigations = appendMitigationIfMissing(risk.Mitigations, mitigation)
		default:
			return errors.Wrap(errors.ErrInvalidInput, fmt.Sprintf("unsupported transcript change field %q", change.Field))
		}
	}

	return nil
}

func readStringValue(raw interface{}) (string, error) {
	switch value := raw.(type) {
	case string:
		return strings.TrimSpace(value), nil
	case map[string]interface{}:
		for _, key := range []string{"text", "value", "content"} {
			if candidate, ok := value[key]; ok {
				return readStringValue(candidate)
			}
		}
	}
	return "", errors.ErrInvalidInput
}

func readOptionalStringValue(raw interface{}) (string, bool, error) {
	value, err := readStringValue(raw)
	if err != nil {
		return "", false, err
	}
	if strings.TrimSpace(value) == "" {
		return "", false, nil
	}
	return value, true, nil
}

func readIntValue(raw interface{}) (int, error) {
	switch value := raw.(type) {
	case int:
		return value, nil
	case int32:
		return int(value), nil
	case int64:
		return int(value), nil
	case float64:
		return int(value), nil
	case jsonNumberLike:
		parsed, err := strconv.Atoi(string(value))
		if err != nil {
			return 0, err
		}
		return parsed, nil
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(value))
		if err != nil {
			return 0, err
		}
		return parsed, nil
	}
	return 0, errors.ErrInvalidInput
}

func readOptionalIntValue(raw interface{}) (int, bool, error) {
	value, err := readIntValue(raw)
	if err != nil {
		return 0, false, err
	}
	if value <= 0 {
		return 0, false, nil
	}
	return value, true, nil
}

type jsonNumberLike string

func readStringListValue(raw interface{}) ([]string, error) {
	switch value := raw.(type) {
	case string:
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return nil, errors.ErrInvalidInput
		}
		return []string{trimmed}, nil
	case []string:
		return filterNonEmptyStrings(value), nil
	case []interface{}:
		result := make([]string, 0, len(value))
		for _, item := range value {
			text, ok, err := readOptionalStringValue(item)
			if err != nil {
				return nil, err
			}
			if ok {
				result = append(result, text)
			}
		}
		return result, nil
	case map[string]interface{}:
		for _, key := range []string{"items", "values"} {
			if candidate, ok := value[key]; ok {
				return readStringListValue(candidate)
			}
		}
	}
	return nil, errors.ErrInvalidInput
}

func filterNonEmptyStrings(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func readMitigationValue(raw interface{}) (entity.Mitigation, error) {
	value, ok := raw.(map[string]interface{})
	if !ok {
		return entity.Mitigation{}, errors.ErrInvalidInput
	}

	action, err := readStringValue(value["action"])
	if err != nil || action == "" {
		return entity.Mitigation{}, errors.ErrInvalidInput
	}

	owner := defaultTranscriptMitigationOwner
	if candidate, ok := value["owner"]; ok {
		if text, err := readStringValue(candidate); err == nil && text != "" {
			owner = text
		}
	}

	mitigation := entity.Mitigation{
		Action:    action,
		Owner:     owner,
		Frequency: "insidental",
	}

	if candidate, ok := value["frequency"]; ok {
		if text, err := readStringValue(candidate); err == nil && text != "" {
			mitigation.Frequency = text
		}
	}
	if candidate, ok := value["dueDate"]; ok && candidate != nil {
		if text, err := readStringValue(candidate); err == nil && text != "" {
			mitigation.DueDate = &text
		}
	}
	if err := mitigation.Validate(); err != nil {
		return entity.Mitigation{}, err
	}
	return mitigation, nil
}

func appendUniqueStrings(existing []string, additions ...string) []string {
	seen := make(map[string]bool, len(existing))
	result := append([]string(nil), existing...)
	for _, item := range existing {
		seen[normalizeListValue(item)] = true
	}
	for _, item := range additions {
		normalized := normalizeListValue(item)
		if normalized == "" || seen[normalized] {
			continue
		}
		result = append(result, strings.TrimSpace(item))
		seen[normalized] = true
	}
	return result
}

func appendMitigationIfMissing(existing []entity.Mitigation, addition entity.Mitigation) []entity.Mitigation {
	normalizedAction := normalizeListValue(addition.Action)
	for _, item := range existing {
		if normalizeListValue(item.Action) == normalizedAction {
			return existing
		}
	}
	return append(existing, addition)
}

func normalizeListValue(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func cloneRisk(risk *entity.Risk) *entity.Risk {
	cloned := *risk
	cloned.Cause = append([]string(nil), risk.Cause...)
	cloned.ImpactDesc = append([]string(nil), risk.ImpactDesc...)
	cloned.Mitigations = append([]entity.Mitigation(nil), risk.Mitigations...)
	return &cloned
}
