package entity

import "github.com/manris/backend/internal/domain/errors"

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
	Task     string `json:"task"`
	PIC      string `json:"pic"`
	Deadline string `json:"deadline"`
	Priority string `json:"priority"`
}

// MeetingMinutes represents structured meeting minutes
type MeetingMinutes struct {
	Title        string       `json:"title"`
	Date         string       `json:"date"`
	Participants []string     `json:"participants"`
	Agenda       []string     `json:"agenda"`
	Summary      string       `json:"summary"`
	Decisions    []string     `json:"decisions"`
	ActionItems  []ActionItem `json:"actionItems"`
}

// TranscriptSuggestion represents a risk suggestion from transcript analysis
type TranscriptSuggestion struct {
	ID          string                 `json:"id"`
	Action      string                 `json:"action"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Quote       string                 `json:"quote"`
	Reasoning   string                 `json:"reasoning"`
	Prefilled   map[string]interface{} `json:"prefilled"`
}

// TranscriptAnalysis represents the result of transcript analysis
type TranscriptAnalysis struct {
	Suggestions []TranscriptSuggestion `json:"suggestions"`
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
}

// RiskSuggestions represents multiple risk suggestions
type RiskSuggestions struct {
	Suggestions []RiskSuggestion `json:"suggestions"`
}

// KRISuggestion represents an AI-generated KRI suggestion
type KRISuggestion struct {
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Metric       string  `json:"metric"`
	ThresholdMin float64 `json:"thresholdMin"`
	ThresholdMax float64 `json:"thresholdMax"`
	Direction    string  `json:"direction"`
	Frequency    string  `json:"frequency"`
}

// KRISuggestions represents multiple KRI suggestions
type KRISuggestions struct {
	Suggestions []KRISuggestion `json:"suggestions"`
}
