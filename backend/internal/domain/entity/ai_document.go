package entity

import (
	"encoding/json"
	"strings"
)

type DocumentAnalysisMode string

const (
	DocumentModeRiskEventExtraction    DocumentAnalysisMode = "risk_event_extraction"
	DocumentModeSOPRiskUniverse        DocumentAnalysisMode = "sop_risk_universe"
	DocumentModeMitigationReportMapper DocumentAnalysisMode = "mitigation_report_mapper"
)

func IsValidDocumentAnalysisMode(mode DocumentAnalysisMode) bool {
	switch mode {
	case DocumentModeRiskEventExtraction, DocumentModeSOPRiskUniverse,
		DocumentModeMitigationReportMapper:
		return true
	default:
		return false
	}
}

type DocumentSourceRef struct {
	Quote    string `json:"quote"`
	Location string `json:"location,omitempty"`
}

// DocumentAnalysisRequest contains only data needed by supported import modes.
// Original filenames, organization charters, risk registers and objectives are excluded.
type DocumentAnalysisRequest struct {
	Mode          DocumentAnalysisMode `json:"mode"`
	DocumentText  string               `json:"documentText"`
	Period        string               `json:"period,omitempty"`
	OpenTasksJSON string               `json:"openTasksJson,omitempty"`
}

// DocumentMitigationTaskContext is the allowlist for external document matching.
type DocumentMitigationTaskContext struct {
	ID               string `json:"id"`
	RiskCode         string `json:"riskCode"`
	RiskTitle        string `json:"riskTitle"`
	MitigationAction string `json:"mitigationAction"`
	PeriodLabel      string `json:"periodLabel"`
}

type DocumentRiskSuggestion struct {
	ClientKey       string              `json:"clientKey"`
	Title           string              `json:"title"`
	Description     string              `json:"description"`
	Category        string              `json:"category"`
	RiskSource      string              `json:"riskSource"`
	Cause           []string            `json:"cause"`
	ImpactDesc      []string            `json:"impactDesc"`
	ExistingControl string              `json:"existingControl,omitempty"`
	ControlGap      string              `json:"controlGap,omitempty"`
	Probability     int                 `json:"probability"`
	Impact          int                 `json:"impact"`
	TreatmentOption string              `json:"treatmentOption"`
	Mitigations     []Mitigation        `json:"mitigations,omitempty"`
	Reasoning       string              `json:"reasoning"`
	Confidence      int                 `json:"confidence"`
	SourceRefs      []DocumentSourceRef `json:"sourceRefs"`
}

func (s *DocumentRiskSuggestion) UnmarshalJSON(data []byte) error {
	type alias DocumentRiskSuggestion
	var raw struct {
		alias
		Mitigations json.RawMessage `json:"mitigations,omitempty"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	*s = DocumentRiskSuggestion(raw.alias)
	if len(raw.Mitigations) == 0 || string(raw.Mitigations) == "null" {
		return nil
	}

	var mitigations []Mitigation
	if err := json.Unmarshal(raw.Mitigations, &mitigations); err == nil {
		s.Mitigations = mitigations
		return nil
	}

	var actions []string
	if err := json.Unmarshal(raw.Mitigations, &actions); err != nil {
		return err
	}

	s.Mitigations = make([]Mitigation, 0, len(actions))
	for _, action := range actions {
		action = strings.TrimSpace(action)
		if action == "" {
			continue
		}
		s.Mitigations = append(s.Mitigations, Mitigation{
			Action: action,
		})
	}

	return nil
}

func (s DocumentRiskSuggestion) SanitizedClientKey() string {
	if strings.TrimSpace(s.ClientKey) != "" {
		return strings.TrimSpace(s.ClientKey)
	}
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(s.Title)), " ", "-")
}

type SOPProcessStageSuggestion struct {
	ClientKey       string                   `json:"clientKey"`
	StageName       string                   `json:"stageName"`
	Description     string                   `json:"description"`
	ExistingControl string                   `json:"existingControl,omitempty"`
	ControlGap      string                   `json:"controlGap,omitempty"`
	Confidence      int                      `json:"confidence"`
	SourceRefs      []DocumentSourceRef      `json:"sourceRefs"`
	SuggestedRisks  []DocumentRiskSuggestion `json:"suggestedRisks"`
}

type SOPRiskUniverseResult struct {
	ProcessStages []SOPProcessStageSuggestion `json:"processStages"`
}

type MitigationTaskReportSuggestion struct {
	ClientKey        string              `json:"clientKey"`
	TaskID           string              `json:"taskId"`
	RiskCode         string              `json:"riskCode"`
	RiskTitle        string              `json:"riskTitle"`
	MitigationAction string              `json:"mitigationAction"`
	PeriodLabel      string              `json:"periodLabel"`
	ReportNotes      string              `json:"reportNotes"`
	Reasoning        string              `json:"reasoning"`
	Confidence       int                 `json:"confidence"`
	SourceRefs       []DocumentSourceRef `json:"sourceRefs"`
}

type MitigationReportMapperResult struct {
	TaskMatches []MitigationTaskReportSuggestion `json:"taskMatches"`
}

type DocumentIntelligenceResult struct {
	Kejadian   *RiskEventExtractionResult    `json:"kejadian,omitempty"`
	Mode       DocumentAnalysisMode          `json:"mode"`
	SOP        *SOPRiskUniverseResult        `json:"sop,omitempty"`
	Mitigation *MitigationReportMapperResult `json:"mitigation,omitempty"`
}
