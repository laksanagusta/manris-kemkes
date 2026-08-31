package entity

import (
	"bytes"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// FishboneCategory represents the 5 categories of Ishikawa fishbone diagram
type FishboneCategory struct {
	Manusia    []string `json:"manusia"`
	Metode     []string `json:"metode"`
	Mesin      []string `json:"mesin"`
	Material   []string `json:"material"`
	Lingkungan []string `json:"lingkungan"`
}

// FishboneAnalysis represents the root cause analysis result
type FishboneAnalysis struct {
	Categories FishboneCategory `json:"categories"`
}

// AIRequest represents a generic AI request with risk context
type AIRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Cause       string `json:"cause,omitempty"`
	Impact      string `json:"impact,omitempty"`
}

// Validate validates the AI request
func (r *AIRequest) Validate() error {
	if r.Title == "" {
		return errors.ErrInvalidTitle
	}
	if r.Description == "" {
		return errors.ErrInvalidDescription
	}
	return nil
}

// MitigationAction represents mitigation action recommendations
type MitigationAction []string

// ActionItem represents an action item from meeting minutes
type ActionItem struct {
	Task              string   `json:"task"`
	PIC               string   `json:"pic"`
	OwnerUnit         string   `json:"ownerUnit,omitempty"`
	Deadline          string   `json:"deadline"`
	Priority          string   `json:"priority"`
	Status            string   `json:"status,omitempty"`
	Notes             string   `json:"notes,omitempty"`
	RelatedDecision   string   `json:"relatedDecision,omitempty"`
	NeedsConfirmation []string `json:"needsConfirmation,omitempty"`
}

// MeetingMinutes represents structured meeting minutes
type MeetingMinutes struct {
	Title        string       `json:"title"`
	Date         string       `json:"date"`
	Participants []string     `json:"participants"`
	Agenda       []string     `json:"agenda"`
	Summary      string       `json:"summary"`
	KeyPoints    []string     `json:"keyPoints"`
	Decisions    []string     `json:"decisions"`
	OpenIssues   []string     `json:"openIssues"`
	ActionItems  []ActionItem `json:"actionItems"`
	NextCheckIn  string       `json:"nextCheckIn,omitempty"`
}

// TranscriptRiskCandidate represents a candidate existing risk for manual disambiguation.
type TranscriptRiskCandidate struct {
	ID    string `json:"id"`
	Code  string `json:"code"`
	Title string `json:"title"`
}

// TranscriptRiskChange represents one structured change extracted from a transcript.
type TranscriptRiskChange struct {
	ID        string      `json:"id"`
	Field     string      `json:"field"`
	Operation string      `json:"operation"`
	Label     string      `json:"label"`
	Value     interface{} `json:"value"`
	Reasoning string      `json:"reasoning"`
	Quote     string      `json:"quote"`
}

// TranscriptRiskDraftPrefill represents the initial values used to seed a new risk draft.
type TranscriptRiskDraftPrefill struct {
	Title           string `json:"title"`
	Description     string `json:"description"`
	Source          string `json:"source"`
	Probability     int    `json:"probability"`
	Impact          int    `json:"impact"`
	Mitigation      string `json:"mitigation"`
	TreatmentOption string `json:"treatmentOption,omitempty"`
}

// TranscriptSuggestion represents a grouped transcript suggestion for an existing or new risk.
type TranscriptSuggestion struct {
	ID              string                      `json:"id"`
	TargetType      string                      `json:"targetType"`
	TargetRiskID    string                      `json:"targetRiskId,omitempty"`
	TargetRiskCode  string                      `json:"targetRiskCode,omitempty"`
	TargetRiskTitle string                      `json:"targetRiskTitle,omitempty"`
	MatchConfidence int                         `json:"matchConfidence,omitempty"`
	CandidateRisks  []TranscriptRiskCandidate   `json:"candidateRisks,omitempty"`
	Quote           string                      `json:"quote"`
	Reasoning       string                      `json:"reasoning"`
	Changes         []TranscriptRiskChange      `json:"changes,omitempty"`
	DraftPrefill    *TranscriptRiskDraftPrefill `json:"draftPrefill,omitempty"`
}

// TranscriptAnalysis represents the result of transcript analysis
type TranscriptAnalysis struct {
	Suggestions []TranscriptSuggestion `json:"suggestions"`
}

// UnmarshalJSON supports both the current object envelope and a legacy bare array payload.
func (t *TranscriptAnalysis) UnmarshalJSON(data []byte) error {
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		t.Suggestions = nil
		return nil
	}

	if trimmed[0] == '[' {
		var suggestions []TranscriptSuggestion
		if err := json.Unmarshal(trimmed, &suggestions); err != nil {
			return err
		}
		t.Suggestions = suggestions
		return nil
	}

	type transcriptAnalysisAlias TranscriptAnalysis
	var alias transcriptAnalysisAlias
	if err := json.Unmarshal(trimmed, &alias); err != nil {
		return err
	}

	*t = TranscriptAnalysis(alias)
	return nil
}

// PredictiveRisk represents predictive risk analysis
type PredictiveRisk struct {
	RiskCode       string `json:"riskCode"`
	Title          string `json:"title"`
	CurrentLevel   string `json:"currentLevel"`
	PredictedLevel string `json:"predictedLevel"`
	Trend          string `json:"trend"` // up, down, stable
	Confidence     int    `json:"confidence"`
	Reasoning      string `json:"reasoning"`
}

// RiskSuggestion represents a suggested risk
type RiskSuggestion struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

// RiskSuggestions represents multiple risk suggestions
type RiskSuggestions struct {
	Suggestions []RiskSuggestion `json:"suggestions"`
}

// IncidentExtractionRequest represents the normalized input for batch incident extraction.
type IncidentExtractionRequest struct {
	DocumentText   string
	OrganizationID *uuid.UUID
}

// ManualIncidentRiskSuggestionRequest represents a single manual incident draft used to suggest related risks.
type ManualIncidentRiskSuggestionRequest struct {
	Title          string
	What           string
	Who            string
	When           *time.Time
	Where          string
	WhyHow         string
	Severity       string
	OrganizationID *uuid.UUID
}

// IncidentDraft contains AI-extracted incident fields before persistence.
type IncidentDraft struct {
	Title            string     `json:"title"`
	What             string     `json:"what"`
	Who              string     `json:"who"`
	When             *time.Time `json:"when,omitempty"`
	Where            string     `json:"where"`
	WhyHow           string     `json:"whyHow"`
	Severity         string     `json:"severity"`
	CorrectiveAction string     `json:"correctiveAction"`
	PreventiveAction string     `json:"preventiveAction"`
}

// IncidentRiskSuggestion is an AI suggestion that matches an incident with an existing risk.
type IncidentRiskSuggestion struct {
	RiskID     uuid.UUID `json:"riskId"`
	RiskCode   string    `json:"riskCode"`
	RiskTitle  string    `json:"riskTitle"`
	Reason     string    `json:"reason"`
	Confidence int       `json:"confidence"`
}

// IncidentExtractionItem is a single extracted incident candidate from a PDF.
type IncidentExtractionItem struct {
	ClientKey       string                   `json:"clientKey"`
	Incident        IncidentDraft            `json:"incident"`
	RiskSuggestions []IncidentRiskSuggestion `json:"riskSuggestions"`
	MissingFields   []string                 `json:"missingFields"`
	Warnings        []string                 `json:"warnings"`
	Confidence      int                      `json:"confidence"`
}

// IncidentBatchExtraction is the response returned by AI for a PDF containing one or more incidents.
type IncidentBatchExtraction struct {
	Items            []IncidentExtractionItem `json:"items"`
	SourcePreview    string                   `json:"sourcePreview"`
	DocumentWarnings []string                 `json:"documentWarnings"`
}
