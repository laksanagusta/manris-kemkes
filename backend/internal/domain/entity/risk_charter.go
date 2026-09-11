package entity

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	RiskCharterStatusDraft      = "draft"
	RiskCharterStatusActive     = "active"
	RiskCharterStatusSuperseded = "superseded"
	RiskCharterStatusArchived   = "archived"

	RiskCharterRoleChair      = "chair"
	RiskCharterRoleSecretary  = "secretary"
	RiskCharterRoleMember     = "member"
	RiskCharterRoleSupervisor = "supervisor"
)

var riskCharterYearPattern = regexp.MustCompile(`^[0-9]{4}$`)

type RiskCharterLegalBasis struct {
	ID        string `json:"id"`
	Reference string `json:"reference"`
	Provision string `json:"provision"`
}

type RiskCharterStakeholder struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Relationship string `json:"relationship"`
}

type RiskCharterUPRMember struct {
	ID       string     `json:"id"`
	Role     string     `json:"role"`
	Name     string     `json:"name"`
	Position string     `json:"position"`
	UserID   *uuid.UUID `json:"userId,omitempty"`
}

type RiskCharter struct {
	ID                 uuid.UUID                `json:"id"`
	Title              string                   `json:"title"`
	OrganizationID     uuid.UUID                `json:"organizationId"`
	UPRLevel           string                   `json:"uprLevel"`
	Period             string                   `json:"period"`
	Scope              string                   `json:"scope"`
	LegalBasis         string                   `json:"legalBasis"`
	LegalBases         []RiskCharterLegalBasis  `json:"legalBases"`
	InternalContext    string                   `json:"internalContext"`
	ExternalContext    string                   `json:"externalContext"`
	StakeholderSummary string                   `json:"stakeholderSummary"`
	Stakeholders       []RiskCharterStakeholder `json:"stakeholders"`
	UPRStructure       []RiskCharterUPRMember   `json:"uprStructure"`
	Status             string                   `json:"status"`
	VersionGroupID     uuid.UUID                `json:"versionGroupId"`
	PreviousVersionID  *uuid.UUID               `json:"previousVersionId,omitempty"`
	VersionNumber      int                      `json:"versionNumber"`
	IsCurrent          bool                     `json:"isCurrent"`
	RevisionReason     string                   `json:"revisionReason"`
	CreatedBy          *uuid.UUID               `json:"createdBy,omitempty"`
	ApprovedBy         *uuid.UUID               `json:"approvedBy,omitempty"`
	ApprovedAt         *time.Time               `json:"approvedAt,omitempty"`
	FinalizedBy        *uuid.UUID               `json:"finalizedBy,omitempty"`
	FinalizedAt        *time.Time               `json:"finalizedAt,omitempty"`
	CreatedAt          time.Time                `json:"createdAt"`
	UpdatedAt          time.Time                `json:"updatedAt"`
}

func (r RiskCharter) Validate() error {
	if title := strings.TrimSpace(r.Title); title == "" || len([]rune(title)) > 120 {
		return fmt.Errorf("title is required and must not exceed 120 characters")
	}
	if r.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if !riskCharterYearPattern.MatchString(strings.TrimSpace(r.Period)) {
		return fmt.Errorf("period must use YYYY format")
	}

	switch r.UPRLevel {
	case "eksekutif", "upr_t1", "upr_t2":
	default:
		return fmt.Errorf("invalid upr level")
	}

	return nil
}

func (r RiskCharter) ValidateForFinalization() error {
	if err := r.Validate(); err != nil {
		return err
	}
	if strings.TrimSpace(r.Scope) == "" {
		return fmt.Errorf("scope is required")
	}
	if len(r.LegalBases) == 0 {
		return fmt.Errorf("at least one legal basis is required")
	}
	for _, item := range r.LegalBases {
		if strings.TrimSpace(item.Reference) == "" {
			return fmt.Errorf("legal basis reference is required")
		}
	}
	if strings.TrimSpace(r.InternalContext) == "" {
		return fmt.Errorf("internal context is required")
	}
	if strings.TrimSpace(r.ExternalContext) == "" {
		return fmt.Errorf("external context is required")
	}
	if len(r.Stakeholders) == 0 {
		return fmt.Errorf("at least one external stakeholder is required")
	}
	for _, item := range r.Stakeholders {
		if strings.TrimSpace(item.Name) == "" || strings.TrimSpace(item.Relationship) == "" {
			return fmt.Errorf("stakeholder name and relationship are required")
		}
	}

	roleCount := map[string]int{}
	for _, member := range r.UPRStructure {
		if strings.TrimSpace(member.Name) == "" || strings.TrimSpace(member.Position) == "" {
			return fmt.Errorf("UPR member name and position are required")
		}
		switch member.Role {
		case RiskCharterRoleChair, RiskCharterRoleSecretary, RiskCharterRoleMember, RiskCharterRoleSupervisor:
		default:
			return fmt.Errorf("invalid UPR member role")
		}
		roleCount[member.Role]++
	}
	if roleCount[RiskCharterRoleChair] != 1 ||
		roleCount[RiskCharterRoleSecretary] != 1 ||
		roleCount[RiskCharterRoleMember] < 1 ||
		roleCount[RiskCharterRoleSupervisor] != 1 {
		return fmt.Errorf("UPR structure requires one chair, one secretary, at least one member, and one supervisor")
	}

	return nil
}
