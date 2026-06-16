package mapping

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/session"
	"github.com/manris/backend/internal/usecase/risk"
)

var (
	ErrMissingField       = errors.New("kolom diperlukan tidak ditemukan")
	ErrInvalidUUID        = errors.New("format UUID tidak valid")
	ErrOrgNotAccessible   = errors.New("organisasi tidak dapat diakses dalam sesi")
	ErrInvalidType        = errors.New("tipe kolom tidak valid")
	ErrInvalidStringSlice = errors.New("format string slice tidak valid")
)

func ToCreateRiskInput(args map[string]any, sess *session.Session) (risk.CreateRiskInput, error) {
	input := risk.CreateRiskInput{}

	if val, ok := args["title"].(string); ok && val != "" {
		input.Title = val
	} else {
		return input, fmt.Errorf("%w: title", ErrMissingField)
	}

	if val, ok := args["description"].(string); ok {
		input.Description = val
	}

	if val, ok := args["category"].(string); ok && val != "" {
		input.Category = val
	} else {
		return input, fmt.Errorf("%w: category", ErrMissingField)
	}

	orgID, err := parseOrgID(args, sess)
	if err != nil {
		return input, err
	}
	input.OrganizationID = orgID

	input.Cause = parseStringSlice(args, "cause")
	input.RiskSource = getStringField(args, "riskSource")
	input.Controllability = getStringField(args, "controllability")
	input.ImpactDesc = parseStringSlice(args, "impactDesc")

	input.ExistingControl = getStringField(args, "existingControl")
	input.ControlEffectiveness = getStringField(args, "controlEffectiveness")
	input.Probability = getIntField(args, "probability")
	input.Impact = getIntField(args, "impact")
	input.Weight = getFloatField(args, "weight")

	input.RiskPriority = getIntField(args, "riskPriority")
	input.RiskAppetite = getStringField(args, "riskAppetite")
	input.TreatmentOption = getStringField(args, "treatmentOption")

	input.Mitigations = parseMitigations(args)

	input.TargetProbability = getIntField(args, "targetProbability")
	input.TargetImpact = getIntField(args, "targetImpact")
	input.TargetWeight = getFloatField(args, "targetWeight")
	input.NextReviewDate = getStringPtrField(args, "nextReviewDate")
	input.ReviewScheduleText = getStringField(args, "reviewScheduleText")
	input.AssessmentCycle = getStringField(args, "assessmentCycle")
	input.ReviewType = getStringField(args, "reviewType")
	input.ChangeReason = getStringField(args, "changeReason")
	input.ReviewSummary = getStringField(args, "reviewSummary")
	input.DraftApprovalLine = parseApprovalLine(args)

	input.CreatedBy = &sess.UserID

	return input, nil
}

func ToUpdateRiskInput(args map[string]any, sess *session.Session) (risk.UpdateRiskInput, error) {
	input := risk.UpdateRiskInput{}

	riskIDStr, ok := args["id"].(string)
	if !ok || riskIDStr == "" {
		return input, fmt.Errorf("%w: id", ErrMissingField)
	}
	riskID, err := uuid.Parse(riskIDStr)
	if err != nil {
		return input, fmt.Errorf("%w: id", ErrInvalidUUID)
	}
	input.ID = riskID

	if val, ok := args["title"].(string); ok {
		input.Title = val
	}

	if val, ok := args["description"].(string); ok {
		input.Description = val
	}

	if val, ok := args["category"].(string); ok {
		input.Category = val
	}

	if val, ok := args["status"].(string); ok {
		input.Status = val
	}

	orgID, err := parseOrgIDOptional(args, sess)
	if err != nil {
		return input, err
	}
	input.OrganizationID = orgID

	input.Cause = parseStringSlice(args, "cause")
	input.RiskSource = getStringField(args, "riskSource")
	input.Controllability = getStringField(args, "controllability")
	input.ImpactDesc = parseStringSlice(args, "impactDesc")

	input.ExistingControl = getStringField(args, "existingControl")
	input.ControlEffectiveness = getStringField(args, "controlEffectiveness")
	input.Probability = getIntField(args, "probability")
	input.Impact = getIntField(args, "impact")
	input.Weight = getFloatField(args, "weight")
	input.Nilai = getIntField(args, "nilai")
	input.InherentScore = getIntField(args, "inherentScore")

	input.RiskPriority = getIntField(args, "riskPriority")
	input.RiskAppetite = getStringField(args, "riskAppetite")
	input.TreatmentOption = getStringField(args, "treatmentOption")

	input.Mitigations = parseMitigations(args)

	input.TargetProbability = getIntField(args, "targetProbability")
	input.TargetImpact = getIntField(args, "targetImpact")
	input.TargetWeight = getFloatField(args, "targetWeight")
	input.TargetNilai = getIntField(args, "targetNilai")
	input.TargetScore = getIntField(args, "targetScore")
	input.NextReviewDate = getStringPtrField(args, "nextReviewDate")
	input.ReviewScheduleText = getStringField(args, "reviewScheduleText")
	input.AssessmentCycle = getStringField(args, "assessmentCycle")
	input.ReviewType = getStringField(args, "reviewType")
	input.ChangeReason = getStringField(args, "changeReason")
	input.ReviewSummary = getStringField(args, "reviewSummary")
	input.DraftApprovalLine = parseApprovalLine(args)

	return input, nil
}

func ToListRisksInput(args map[string]any, sess *session.Session) (risk.ListRisksInput, error) {
	input := risk.ListRisksInput{}

	if orgIDsArg, ok := args["organizationIds"]; ok {
		if orgIDsInterface, ok := orgIDsArg.([]interface{}); ok {
			var orgIDs []uuid.UUID
			for _, idInterface := range orgIDsInterface {
				if idStr, ok := idInterface.(string); ok {
					if id, err := uuid.Parse(idStr); err == nil {
						if !orgAccessible(id, sess) {
							return input, fmt.Errorf("%w: organizationIds", ErrOrgNotAccessible)
						}
						orgIDs = append(orgIDs, id)
					}
				}
			}
			if len(orgIDs) > 0 {
				input.OrgIDs = orgIDs
			} else {
				input.OrgIDs = sess.AccessibleOrgIDs
			}
		} else {
			input.OrgIDs = sess.AccessibleOrgIDs
		}
	} else {
		input.OrgIDs = sess.AccessibleOrgIDs
	}

	input.Status = getStringField(args, "status")
	input.Category = getStringField(args, "category")

	return input, nil
}

func parseOrgID(args map[string]any, sess *session.Session) (*uuid.UUID, error) {
	if orgIDStr, ok := args["organizationId"].(string); ok && orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return nil, fmt.Errorf("%w: organizationId", ErrInvalidUUID)
		}
		if !orgAccessible(orgID, sess) {
			return nil, fmt.Errorf("%w: organizationId", ErrOrgNotAccessible)
		}
		return &orgID, nil
	}
	if len(sess.AccessibleOrgIDs) > 0 {
		return &sess.AccessibleOrgIDs[0], nil
	}
	return nil, nil
}

func parseOrgIDOptional(args map[string]any, sess *session.Session) (*uuid.UUID, error) {
	if orgIDStr, ok := args["organizationId"].(string); ok && orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return nil, fmt.Errorf("%w: organizationId", ErrInvalidUUID)
		}
		if !orgAccessible(orgID, sess) {
			return nil, fmt.Errorf("%w: organizationId", ErrOrgNotAccessible)
		}
		return &orgID, nil
	}
	return nil, nil
}

func orgAccessible(orgID uuid.UUID, sess *session.Session) bool {
	for _, accessible := range sess.AccessibleOrgIDs {
		if accessible == orgID {
			return true
		}
	}
	return false
}

func getStringField(args map[string]any, key string) string {
	if val, ok := args[key].(string); ok {
		return val
	}
	return ""
}

func getStringPtrField(args map[string]any, key string) *string {
	if val, ok := args[key].(string); ok && val != "" {
		return &val
	}
	return nil
}

func getIntField(args map[string]any, key string) int {
	switch v := args[key].(type) {
	case int:
		return v
	case float64:
		return int(v)
	case string:
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return 0
}

func getFloatField(args map[string]any, key string) float64 {
	switch v := args[key].(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return 0.0
}

func parseStringSlice(args map[string]any, key string) []string {
	var result []string
	if val, ok := args[key].([]interface{}); ok {
		for _, item := range val {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
	}
	return result
}

func parseMitigations(args map[string]any) []entity.Mitigation {
	var mitigations []entity.Mitigation
	if val, ok := args["mitigations"].([]interface{}); ok {
		for _, item := range val {
			if mMap, ok := item.(map[string]interface{}); ok {
				m := entity.Mitigation{
					Action:    getStringFieldFromMap(mMap, "action"),
					Owner:     getStringFieldFromMap(mMap, "owner"),
					DueDate:   getStringPtrFieldFromMap(mMap, "dueDate"),
					Frequency: getStringFieldFromMap(mMap, "frequency"),
				}
				mitigations = append(mitigations, m)
			}
		}
	}
	return mitigations
}

func parseApprovalLine(args map[string]any) []entity.ApprovalLineMember {
	var members []entity.ApprovalLineMember
	if val, ok := args["draftApprovalLine"].([]interface{}); ok {
		for _, item := range val {
			if mMap, ok := item.(map[string]interface{}); ok {
				member := entity.ApprovalLineMember{
					ID:   getStringFieldFromMap(mMap, "id"),
					Name: getStringFieldFromMap(mMap, "name"),
					Type: getStringFieldFromMap(mMap, "type"),
				}
				members = append(members, member)
			}
		}
	}
	return members
}

func getStringFieldFromMap(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getStringPtrFieldFromMap(m map[string]interface{}, key string) *string {
	if val, ok := m[key].(string); ok && val != "" {
		return &val
	}
	return nil
}
