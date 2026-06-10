package entity

import (
	"math"
	"reflect"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

const (
	RiskMonitoringStatusDraft     = "draft"
	RiskMonitoringStatusFinalized = "finalized"
	RiskMonitoringStatusVoid      = "void"

	RiskMonitoringModeScoreOnly           = "score_only"
	RiskMonitoringModeWithProfileRevision = "with_profile_revision"
)

type RiskMonitoring struct {
	ID                          uuid.UUID                   `json:"id"`
	SourceRiskID                uuid.UUID                   `json:"sourceRiskId"`
	ResultRiskID                *uuid.UUID                  `json:"resultRiskId,omitempty"`
	AssessmentCycle             string                      `json:"assessmentCycle"`
	Status                      string                      `json:"status"`
	Mode                        string                      `json:"mode"`
	SourceProbability           int                         `json:"sourceProbability"`
	SourceImpact                int                         `json:"sourceImpact"`
	SourceWeight                float64                     `json:"sourceWeight"`
	SourceNilai                 float64                     `json:"sourceNilai"`
	SourceLevel                 string                      `json:"sourceLevel"`
	SourceVersionNumber         int                         `json:"sourceVersionNumber"`
	ObservedProbability         int                         `json:"observedProbability"`
	ObservedImpact              int                         `json:"observedImpact"`
	ObservedWeight              float64                     `json:"observedWeight"`
	ObservedNilai               float64                     `json:"observedNilai"`
	ObservedLevel               string                      `json:"observedLevel"`
	ConditionSummary            string                      `json:"conditionSummary"`
	EventSummary                string                      `json:"eventSummary"`
	Trend                       string                      `json:"trend"`
	EffectivenessConclusion     string                      `json:"effectivenessConclusion"`
	FollowUpNote                string                      `json:"followUpNote"`
	Conclusion                  string                      `json:"conclusion"`
	MitigationProgressSummary   string                      `json:"mitigationProgressSummary"`
	MitigationCompletionPercent int                         `json:"mitigationCompletionPercent"`
	MitigationObstacles         string                      `json:"mitigationObstacles"`
	MitigationFollowUp          string                      `json:"mitigationFollowUp"`
	DraftPayload                *RiskMonitoringDraftPayload `json:"-"`
	DraftTitle                  string                      `json:"draftTitle"`
	DraftCategory               string                      `json:"draftCategory"`
	DraftCause                  []string                    `json:"draftCause"`
	DraftRiskSource             string                      `json:"draftRiskSource"`
	DraftControllability        string                      `json:"draftControllability"`
	DraftImpactDesc             []string                    `json:"draftImpactDesc"`
	DraftExistingControl        string                      `json:"draftExistingControl"`
	DraftControlEffectiveness   string                      `json:"draftControlEffectiveness"`
	DraftTreatmentOption        string                      `json:"draftTreatmentOption"`
	DraftMitigations            []Mitigation                `json:"draftMitigations"`
	ProfileChangeSummary        []string                    `json:"profileChangeSummary"`
	ChangeReason                string                      `json:"changeReason"`
	StartedBy                   *uuid.UUID                  `json:"startedBy,omitempty"`
	StartedAt                   time.Time                   `json:"startedAt"`
	FinalizedBy                 *uuid.UUID                  `json:"finalizedBy,omitempty"`
	FinalizedAt                 *time.Time                  `json:"finalizedAt,omitempty"`
	VoidedBy                    *uuid.UUID                  `json:"voidedBy,omitempty"`
	VoidedAt                    *time.Time                  `json:"voidedAt,omitempty"`
	VoidReason                  string                      `json:"voidReason"`
	CreatedAt                   time.Time                   `json:"createdAt"`
	UpdatedAt                   time.Time                   `json:"updatedAt"`
	SourceRisk                  *Risk                       `json:"sourceRisk,omitempty"`
	ResultRisk                  *Risk                       `json:"resultRisk,omitempty"`
}

type RiskMonitoringDraftPayload struct {
	Title                string       `json:"title"`
	Category             string       `json:"category"`
	Cause                []string     `json:"cause"`
	RiskSource           string       `json:"riskSource"`
	Controllability      string       `json:"controllability"`
	ImpactDesc           []string     `json:"impactDesc"`
	ExistingControl      string       `json:"existingControl"`
	ControlEffectiveness string       `json:"controlEffectiveness"`
	TreatmentOption      string       `json:"treatmentOption"`
	Mitigations          []Mitigation `json:"mitigations"`
}

type RiskMonitoringDraftValues struct {
	Title                string
	Category             string
	Cause                []string
	RiskSource           string
	Controllability      string
	ImpactDesc           []string
	ExistingControl      string
	ControlEffectiveness string
	TreatmentOption      string
	Mitigations          []Mitigation
	Probability          int
	Impact               int
	ConditionSummary     string
	EventSummary         string
	Effectiveness        string
	Conclusion           string
	ChangeReason         string
}

func NewRiskMonitoringDraft(source *Risk, cycle string, startedBy uuid.UUID) *RiskMonitoring {
	draft := &RiskMonitoring{
		SourceRiskID:        source.ID,
		AssessmentCycle:     cycle,
		Status:              RiskMonitoringStatusDraft,
		Mode:                RiskMonitoringModeScoreOnly,
		SourceProbability:   source.Probability,
		SourceImpact:        source.Impact,
		SourceWeight:        source.Weight,
		SourceNilai:         source.EffectiveNilai(),
		SourceLevel:         source.GetRiskLevel(),
		SourceVersionNumber: source.VersionNumber,
		ObservedProbability: source.Probability,
		ObservedImpact:      source.Impact,
		ObservedWeight:      source.Weight,
		ObservedNilai:       source.EffectiveNilai(),
		ObservedLevel:       source.GetRiskLevel(),
		Trend:               "stable",
		StartedBy:           &startedBy,
	}
	draft.SetDraftPayload(NewRiskMonitoringDraftPayloadFromRisk(source))
	draft.NormalizeNilaiForStorage()
	if source.CreatedAt.IsZero() {
		draft.StartedAt = time.Now().UTC()
	} else {
		draft.StartedAt = time.Now().UTC()
	}
	return draft
}

func NewRiskMonitoringDraftPayloadFromRisk(source *Risk) *RiskMonitoringDraftPayload {
	if source == nil {
		return &RiskMonitoringDraftPayload{}
	}
	return &RiskMonitoringDraftPayload{
		Title:                source.Title,
		Category:             source.Category,
		Cause:                append([]string(nil), source.Cause...),
		RiskSource:           source.RiskSource,
		Controllability:      source.Controllability,
		ImpactDesc:           append([]string(nil), source.ImpactDesc...),
		ExistingControl:      source.ExistingControl,
		ControlEffectiveness: source.ControlEffectiveness,
		TreatmentOption:      source.TreatmentOption,
		Mitigations:          append([]Mitigation(nil), source.Mitigations...),
	}
}

func NewRiskMonitoringDraftPayloadFromValues(values RiskMonitoringDraftValues) *RiskMonitoringDraftPayload {
	return &RiskMonitoringDraftPayload{
		Title:                values.Title,
		Category:             values.Category,
		Cause:                append([]string(nil), values.Cause...),
		RiskSource:           values.RiskSource,
		Controllability:      values.Controllability,
		ImpactDesc:           append([]string(nil), values.ImpactDesc...),
		ExistingControl:      values.ExistingControl,
		ControlEffectiveness: values.ControlEffectiveness,
		TreatmentOption:      values.TreatmentOption,
		Mitigations:          append([]Mitigation(nil), values.Mitigations...),
	}
}

func (m *RiskMonitoring) SetDraftPayload(payload *RiskMonitoringDraftPayload) {
	if payload == nil {
		m.DraftPayload = nil
		m.DraftTitle = ""
		m.DraftCategory = ""
		m.DraftCause = nil
		m.DraftRiskSource = ""
		m.DraftControllability = ""
		m.DraftImpactDesc = nil
		m.DraftExistingControl = ""
		m.DraftControlEffectiveness = ""
		m.DraftTreatmentOption = ""
		m.DraftMitigations = nil
		return
	}
	m.DraftPayload = payload.Clone()
	m.syncDraftFieldsFromPayload()
}

func (m *RiskMonitoring) DraftPayloadSnapshot() *RiskMonitoringDraftPayload {
	if m == nil {
		return nil
	}
	if m.DraftPayload != nil {
		return m.DraftPayload.Clone()
	}
	return &RiskMonitoringDraftPayload{
		Title:                m.DraftTitle,
		Category:             m.DraftCategory,
		Cause:                append([]string(nil), m.DraftCause...),
		RiskSource:           m.DraftRiskSource,
		Controllability:      m.DraftControllability,
		ImpactDesc:           append([]string(nil), m.DraftImpactDesc...),
		ExistingControl:      m.DraftExistingControl,
		ControlEffectiveness: m.DraftControlEffectiveness,
		TreatmentOption:      m.DraftTreatmentOption,
		Mitigations:          append([]Mitigation(nil), m.DraftMitigations...),
	}
}

func (m *RiskMonitoring) syncDraftFieldsFromPayload() {
	if m == nil || m.DraftPayload == nil {
		return
	}
	m.DraftTitle = m.DraftPayload.Title
	m.DraftCategory = m.DraftPayload.Category
	m.DraftCause = append([]string(nil), m.DraftPayload.Cause...)
	m.DraftRiskSource = m.DraftPayload.RiskSource
	m.DraftControllability = m.DraftPayload.Controllability
	m.DraftImpactDesc = append([]string(nil), m.DraftPayload.ImpactDesc...)
	m.DraftExistingControl = m.DraftPayload.ExistingControl
	m.DraftControlEffectiveness = m.DraftPayload.ControlEffectiveness
	m.DraftTreatmentOption = m.DraftPayload.TreatmentOption
	m.DraftMitigations = append([]Mitigation(nil), m.DraftPayload.Mitigations...)
}

func (p *RiskMonitoringDraftPayload) Clone() *RiskMonitoringDraftPayload {
	if p == nil {
		return nil
	}
	clone := *p
	clone.Cause = append([]string(nil), p.Cause...)
	clone.ImpactDesc = append([]string(nil), p.ImpactDesc...)
	clone.Mitigations = append([]Mitigation(nil), p.Mitigations...)
	return &clone
}

func (m *RiskMonitoring) CalculateObservedScore() {
	m.ObservedWeight = GetBobot(m.ObservedProbability, m.ObservedImpact)
	m.ObservedNilai = CalculateNilai(m.ObservedProbability, m.ObservedImpact, m.ObservedWeight)
	m.ObservedLevel = GetRiskLevelFromNilai(m.ObservedNilai)
}

func (m *RiskMonitoring) NormalizeNilaiForStorage() {
	if m == nil {
		return
	}
	m.SourceNilai = math.Round(m.SourceNilai)
	m.ObservedNilai = math.Round(m.ObservedNilai)
}

func DetectRiskMonitoringMode(source *Risk, values *RiskMonitoringDraftValues) (string, []string) {
	changed := make([]string, 0)
	if source.Title != values.Title {
		changed = append(changed, "title")
	}
	if source.Category != values.Category {
		changed = append(changed, "category")
	}
	if !reflect.DeepEqual(source.Cause, values.Cause) {
		changed = append(changed, "cause")
	}
	if source.RiskSource != values.RiskSource {
		changed = append(changed, "riskSource")
	}
	if source.Controllability != values.Controllability {
		changed = append(changed, "controllability")
	}
	if !reflect.DeepEqual(source.ImpactDesc, values.ImpactDesc) {
		changed = append(changed, "impactDesc")
	}
	if source.ExistingControl != values.ExistingControl {
		changed = append(changed, "existingControl")
	}
	if source.ControlEffectiveness != values.ControlEffectiveness {
		changed = append(changed, "controlEffectiveness")
	}
	if source.TreatmentOption != values.TreatmentOption {
		changed = append(changed, "treatmentOption")
	}
	if mitigationPlanChanged(source.Mitigations, values.Mitigations) {
		changed = append(changed, "mitigations")
	}
	if len(changed) > 0 {
		return RiskMonitoringModeWithProfileRevision, changed
	}
	return RiskMonitoringModeScoreOnly, changed
}

func mitigationPlanChanged(source []Mitigation, draft []Mitigation) bool {
	if len(source) != len(draft) {
		return true
	}
	for i := range source {
		if source[i].Action != draft[i].Action ||
			source[i].Owner != draft[i].Owner ||
			source[i].DueDate != draft[i].DueDate ||
			source[i].TargetCost != draft[i].TargetCost ||
			source[i].ExpectedOutput != draft[i].ExpectedOutput ||
			source[i].MitigationType != draft[i].MitigationType {
			return true
		}
	}
	return false
}

func (m *RiskMonitoring) Validate() error {
	if m.SourceRiskID == uuid.Nil {
		return errors.Wrap(errors.ErrInvalidInput, "source risk is required")
	}
	if m.AssessmentCycle == "" {
		return errors.Wrap(errors.ErrInvalidInput, "assessment cycle is required")
	}
	if m.Status == "" {
		return errors.Wrap(errors.ErrInvalidInput, "status is required")
	}
	if m.Mode == "" {
		return errors.Wrap(errors.ErrInvalidInput, "mode is required")
	}
	return nil
}
