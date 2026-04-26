package tools

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func mergeRiskUpdateInputWithCurrent(input *riskuc.UpdateRiskInput, args map[string]any, current *entity.Risk) {
	if _, ok := args["title"]; !ok {
		input.Title = current.Title
	}
	if _, ok := args["description"]; !ok {
		input.Description = current.Description
	}
	if _, ok := args["category"]; !ok {
		input.Category = current.Category
	}
	if _, ok := args["status"]; !ok {
		input.Status = current.Status
	}
	if _, ok := args["organizationId"]; !ok {
		input.OrganizationID = cloneUUIDPtr(current.OrganizationID)
	}

	if _, ok := args["cause"]; !ok {
		input.Cause = append([]string(nil), current.Cause...)
	}
	if _, ok := args["riskSource"]; !ok {
		input.RiskSource = current.RiskSource
	}
	if _, ok := args["controllability"]; !ok {
		input.Controllability = current.Controllability
	}
	if _, ok := args["impactDesc"]; !ok {
		input.ImpactDesc = append([]string(nil), current.ImpactDesc...)
	}

	if _, ok := args["existingControl"]; !ok {
		input.ExistingControl = current.ExistingControl
	}
	if _, ok := args["controlEffectiveness"]; !ok {
		input.ControlEffectiveness = current.ControlEffectiveness
	}
	if _, ok := args["probability"]; !ok {
		input.Probability = current.Probability
	}
	if _, ok := args["impact"]; !ok {
		input.Impact = current.Impact
	}
	if _, ok := args["weight"]; !ok {
		input.Weight = current.Weight
	}

	if _, ok := args["riskPriority"]; !ok {
		input.RiskPriority = current.RiskPriority
	}
	if _, ok := args["riskAppetite"]; !ok {
		input.RiskAppetite = current.RiskAppetite
	}
	if _, ok := args["treatmentOption"]; !ok {
		input.TreatmentOption = current.TreatmentOption
	}

	if _, ok := args["mitigations"]; !ok {
		input.Mitigations = cloneMitigations(current.Mitigations)
	}

	if _, ok := args["targetProbability"]; !ok {
		input.TargetProbability = current.TargetProbability
	}
	if _, ok := args["targetImpact"]; !ok {
		input.TargetImpact = current.TargetImpact
	}
	if _, ok := args["targetWeight"]; !ok {
		input.TargetWeight = current.TargetWeight
	}
	if _, ok := args["nextReviewDate"]; !ok {
		input.NextReviewDate = cloneStringPtr(current.NextReviewDate)
	}
	if _, ok := args["reviewScheduleText"]; !ok {
		input.ReviewScheduleText = current.ReviewScheduleText
	}
	if _, ok := args["assessmentCycle"]; !ok {
		input.AssessmentCycle = current.AssessmentCycle
	}
	if _, ok := args["reviewType"]; !ok {
		input.ReviewType = current.ReviewType
	}
	if _, ok := args["changeReason"]; !ok {
		input.ChangeReason = current.ChangeReason
	}
	if _, ok := args["reviewSummary"]; !ok {
		input.ReviewSummary = current.ReviewSummary
	}
	if _, ok := args["draftApprovalLine"]; !ok {
		input.DraftApprovalLine = cloneApprovalLineMembers(current.DraftApprovalLine)
	}
}

func cloneUUIDPtr(id *uuid.UUID) *uuid.UUID {
	if id == nil {
		return nil
	}
	clone := *id
	return &clone
}

func cloneStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	clone := *value
	return &clone
}

func cloneMitigations(mitigations []entity.Mitigation) []entity.Mitigation {
	if mitigations == nil {
		return nil
	}
	cloned := make([]entity.Mitigation, len(mitigations))
	copy(cloned, mitigations)
	for i := range cloned {
		cloned[i].DueDate = cloneStringPtr(cloned[i].DueDate)
	}
	return cloned
}

func cloneApprovalLineMembers(members []entity.ApprovalLineMember) []entity.ApprovalLineMember {
	if members == nil {
		return nil
	}
	cloned := make([]entity.ApprovalLineMember, len(members))
	copy(cloned, members)
	return cloned
}
