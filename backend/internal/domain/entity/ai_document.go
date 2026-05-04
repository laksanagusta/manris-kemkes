package entity

import (
	"encoding/json"
	"strings"
)

type DocumentAnalysisMode string

const (
	DocumentModeSOPRiskUniverse        DocumentAnalysisMode = "sop_risk_universe"
	DocumentModeAuditFindingMapper     DocumentAnalysisMode = "audit_finding_mapper"
	DocumentModeStrategicObjectiveRisk DocumentAnalysisMode = "strategic_objective_risk"
	DocumentModeMitigationReportMapper DocumentAnalysisMode = "mitigation_report_mapper"
)

func IsValidDocumentAnalysisMode(mode DocumentAnalysisMode) bool {
	switch mode {
	case DocumentModeSOPRiskUniverse,
		DocumentModeAuditFindingMapper,
		DocumentModeStrategicObjectiveRisk,
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

type DocumentAnalysisRequest struct {
	Mode              DocumentAnalysisMode `json:"mode"`
	DocumentText      string               `json:"documentText"`
	Filename          string               `json:"filename"`
	Period            string               `json:"period,omitempty"`
	ExistingRisksJSON string               `json:"existingRisksJson,omitempty"`
	ObjectivesJSON    string               `json:"objectivesJson,omitempty"`
	OpenTasksJSON     string               `json:"openTasksJson,omitempty"`
}

type DocumentRiskSuggestion struct {
	ClientKey            string              `json:"clientKey"`
	Title                string              `json:"title"`
	Description          string              `json:"description"`
	Category             string              `json:"category"`
	RiskSource           string              `json:"riskSource"`
	Cause                []string            `json:"cause"`
	ImpactDesc           []string            `json:"impactDesc"`
	ExistingControl      string              `json:"existingControl,omitempty"`
	ControlGap           string              `json:"controlGap,omitempty"`
	Probability          int                 `json:"probability"`
	Impact               int                 `json:"impact"`
	TreatmentOption      string              `json:"treatmentOption"`
	Mitigations          []Mitigation        `json:"mitigations,omitempty"`
	Reasoning            string              `json:"reasoning"`
	Confidence           int                 `json:"confidence"`
	SourceRefs           []DocumentSourceRef `json:"sourceRefs"`
	RelatedObjectiveText string              `json:"relatedObjectiveText,omitempty"`
	RelatedIKUText       string              `json:"relatedIkuText,omitempty"`
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

type AuditFindingSuggestion struct {
	ClientKey          string                  `json:"clientKey"`
	FindingTitle       string                  `json:"findingTitle"`
	FindingDescription string                  `json:"findingDescription"`
	RootCause          string                  `json:"rootCause"`
	Impact             string                  `json:"impact"`
	AffectedArea       string                  `json:"affectedArea"`
	MappingStatus      string                  `json:"mappingStatus"`
	ExistingRiskID     string                  `json:"existingRiskId,omitempty"`
	ExistingRiskCode   string                  `json:"existingRiskCode,omitempty"`
	ExistingRiskTitle  string                  `json:"existingRiskTitle,omitempty"`
	SuggestedRisk      *DocumentRiskSuggestion `json:"suggestedRisk,omitempty"`
	Reasoning          string                  `json:"reasoning"`
	Confidence         int                     `json:"confidence"`
	SourceRefs         []DocumentSourceRef     `json:"sourceRefs"`
}

type AuditFindingMapperResult struct {
	Findings []AuditFindingSuggestion `json:"findings"`
}

type StrategicIKUSuggestion struct {
	ClientKey       string                   `json:"clientKey"`
	Name            string                   `json:"name"`
	Target          string                   `json:"target,omitempty"`
	Program         string                   `json:"program,omitempty"`
	Kegiatan        string                   `json:"kegiatan,omitempty"`
	ProcessBusiness string                   `json:"processBusiness,omitempty"`
	Confidence      int                      `json:"confidence"`
	SourceRefs      []DocumentSourceRef      `json:"sourceRefs"`
	SuggestedRisks  []DocumentRiskSuggestion `json:"suggestedRisks"`
}

type StrategicObjectiveSuggestion struct {
	ClientKey  string                   `json:"clientKey"`
	Tujuan     string                   `json:"tujuan"`
	Sasaran    string                   `json:"sasaran"`
	Period     string                   `json:"period,omitempty"`
	Unit       string                   `json:"unit,omitempty"`
	Confidence int                      `json:"confidence"`
	SourceRefs []DocumentSourceRef      `json:"sourceRefs"`
	IKUs       []StrategicIKUSuggestion `json:"ikus"`
}

type StrategicObjectiveRiskResult struct {
	Objectives []StrategicObjectiveSuggestion `json:"objectives"`
}

type MitigationTaskReportSuggestion struct {
	ClientKey        string              `json:"clientKey"`
	TaskID           string              `json:"taskId"`
	RiskCode         string              `json:"riskCode"`
	RiskTitle        string              `json:"riskTitle"`
	MitigationAction string              `json:"mitigationAction"`
	PeriodLabel      string              `json:"periodLabel"`
	SuggestedStatus  string              `json:"suggestedStatus"`
	ProgressPct      int                 `json:"progressPct"`
	ActualCost       float64             `json:"actualCost"`
	ReportNotes      string              `json:"reportNotes"`
	Blocker          string              `json:"blocker,omitempty"`
	Reasoning        string              `json:"reasoning"`
	Confidence       int                 `json:"confidence"`
	SourceRefs       []DocumentSourceRef `json:"sourceRefs"`
}

type MitigationReportMapperResult struct {
	TaskMatches []MitigationTaskReportSuggestion `json:"taskMatches"`
}

type DocumentIntelligenceResult struct {
	Mode       DocumentAnalysisMode          `json:"mode"`
	SOP        *SOPRiskUniverseResult        `json:"sop,omitempty"`
	Audit      *AuditFindingMapperResult     `json:"audit,omitempty"`
	Strategic  *StrategicObjectiveRiskResult `json:"strategic,omitempty"`
	Mitigation *MitigationReportMapperResult `json:"mitigation,omitempty"`
}
