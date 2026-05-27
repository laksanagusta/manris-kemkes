package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type EvaluationStatus string

const (
	EvaluationStatusDraft EvaluationStatus = "draft"
	EvaluationStatusFinal EvaluationStatus = "final"
)

type EvaluationTemplateStatus string

const (
	EvaluationTemplateStatusDraft    EvaluationTemplateStatus = "draft"
	EvaluationTemplateStatusActive   EvaluationTemplateStatus = "active"
	EvaluationTemplateStatusArchived EvaluationTemplateStatus = "archived"
)

type EvaluationAnswer string

const (
	EvaluationAnswerUnset EvaluationAnswer = "unset"
	EvaluationAnswerYes   EvaluationAnswer = "yes"
	EvaluationAnswerNo    EvaluationAnswer = "no"
)

type EvaluationTemplate struct {
	ID          uuid.UUID                   `json:"id"`
	TemplateKey string                      `json:"templateKey"`
	Name        string                      `json:"name"`
	Version     int                         `json:"version"`
	Status      EvaluationTemplateStatus    `json:"status"`
	Sections    []EvaluationTemplateSection `json:"sections,omitempty"`
	CreatedAt   time.Time                   `json:"createdAt"`
	UpdatedAt   time.Time                   `json:"updatedAt"`
}

type EvaluationTemplateSection struct {
	ID          uuid.UUID                `json:"id"`
	TemplateID  uuid.UUID                `json:"templateId"`
	SectionKey  string                   `json:"sectionKey"`
	Title       string                   `json:"title"`
	Description string                   `json:"description"`
	SortOrder   int                      `json:"sortOrder"`
	Items       []EvaluationTemplateItem `json:"items,omitempty"`
	CreatedAt   time.Time                `json:"createdAt"`
	UpdatedAt   time.Time                `json:"updatedAt"`
}

type EvaluationTemplateItem struct {
	ID                 uuid.UUID `json:"id"`
	SectionID          uuid.UUID `json:"sectionId"`
	ItemKey            string    `json:"itemKey"`
	ItemNo             string    `json:"itemNo"`
	Label              string    `json:"label"`
	DefaultCondition   string    `json:"defaultCondition"`
	DefaultDescription string    `json:"defaultDescription"`
	DefaultAnalysis    string    `json:"defaultAnalysis"`
	SortOrder          int       `json:"sortOrder"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type Evaluation struct {
	ID                     uuid.UUID           `json:"id"`
	OrganizationID         uuid.UUID           `json:"organizationId"`
	SequenceNo             int                 `json:"sequenceNo"`
	Code                   string              `json:"code"`
	Period                 string              `json:"period"`
	TemplateID             uuid.UUID           `json:"templateId"`
	TemplateName           string              `json:"templateName,omitempty"`
	Status                 EvaluationStatus    `json:"status"`
	ReportNumber           string              `json:"reportNumber"`
	ReportDate             *time.Time          `json:"reportDate,omitempty"`
	AssignmentLetterNumber string              `json:"assignmentLetterNumber"`
	AssignmentLetterDate   *time.Time          `json:"assignmentLetterDate,omitempty"`
	MonitoringDateRange    string              `json:"monitoringDateRange"`
	UnitCode               string              `json:"unitCode"`
	UnitLocation           string              `json:"unitLocation"`
	UnitAddress            string              `json:"unitAddress"`
	UnitEselonI            string              `json:"unitEselonI"`
	UnitLeaderName         string              `json:"unitLeaderName"`
	TeamCoordinator        string              `json:"teamCoordinator"`
	TeamLead               string              `json:"teamLead"`
	TeamMembers            string              `json:"teamMembers"`
	Problems               string              `json:"problems"`
	Recommendations        string              `json:"recommendations"`
	CreatedBy              *uuid.UUID          `json:"createdBy,omitempty"`
	FinalizedAt            *time.Time          `json:"finalizedAt,omitempty"`
	Sections               []EvaluationSection `json:"sections,omitempty"`
	CreatedAt              time.Time           `json:"createdAt"`
	UpdatedAt              time.Time           `json:"updatedAt"`
}

type EvaluationSection struct {
	ID                uuid.UUID        `json:"id"`
	EvaluationID      uuid.UUID        `json:"evaluationId"`
	TemplateSectionID *uuid.UUID       `json:"templateSectionId,omitempty"`
	SectionKey        string           `json:"sectionKey"`
	Title             string           `json:"title"`
	Description       string           `json:"description"`
	Conclusion        string           `json:"conclusion"`
	SortOrder         int              `json:"sortOrder"`
	Items             []EvaluationItem `json:"items,omitempty"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
}

type EvaluationItem struct {
	ID             uuid.UUID        `json:"id"`
	SectionID      uuid.UUID        `json:"sectionId"`
	TemplateItemID *uuid.UUID       `json:"templateItemId,omitempty"`
	ItemKey        string           `json:"itemKey"`
	ItemNo         string           `json:"itemNo"`
	Label          string           `json:"label"`
	Answer         EvaluationAnswer `json:"answer"`
	Condition      string           `json:"condition"`
	Description    string           `json:"description"`
	Analysis       string           `json:"analysis"`
	SortOrder      int              `json:"sortOrder"`
	CreatedAt      time.Time        `json:"createdAt"`
	UpdatedAt      time.Time        `json:"updatedAt"`
}

func (e Evaluation) Validate() error {
	if e.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(e.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if e.TemplateID == uuid.Nil {
		return fmt.Errorf("template id is required")
	}
	switch e.Status {
	case "", EvaluationStatusDraft, EvaluationStatusFinal:
		return nil
	default:
		return fmt.Errorf("invalid evaluation status")
	}
}

func (i EvaluationItem) Validate() error {
	if strings.TrimSpace(i.ItemKey) == "" {
		return fmt.Errorf("item key is required")
	}
	if strings.TrimSpace(i.ItemNo) == "" {
		return fmt.Errorf("item number is required")
	}
	if strings.TrimSpace(i.Label) == "" {
		return fmt.Errorf("item label is required")
	}
	switch i.Answer {
	case "", EvaluationAnswerUnset, EvaluationAnswerYes, EvaluationAnswerNo:
		return nil
	default:
		return fmt.Errorf("invalid evaluation answer")
	}
}
