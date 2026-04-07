package entity

import (
	"time"
)

type SystemSetting struct {
	Key         string    `json:"key"`
	Value       string    `json:"value"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type AIModels struct {
	Default        string `json:"default"`
	Cause          string `json:"cause"`
	Impact         string `json:"impact"`
	Mitigation     string `json:"mitigation"`
	Transcript     string `json:"transcript"`
	Predictive     string `json:"predictive"`
	Minutes        string `json:"minutes"`
	KRI            string `json:"kri"`
	RiskSuggestion string `json:"riskSuggestion"`
	Incident       string `json:"incident"`
	CBA            string `json:"cba"`
}

func (m *AIModels) GetModelForFeature(feature string) string {
	switch feature {
	case "cause":
		if m.Cause != "" {
			return m.Cause
		}
	case "impact":
		if m.Impact != "" {
			return m.Impact
		}
	case "mitigation":
		if m.Mitigation != "" {
			return m.Mitigation
		}
	case "transcript":
		if m.Transcript != "" {
			return m.Transcript
		}
	case "predictive":
		if m.Predictive != "" {
			return m.Predictive
		}
	case "minutes":
		if m.Minutes != "" {
			return m.Minutes
		}
	case "kri":
		if m.KRI != "" {
			return m.KRI
		}
	case "risk-suggestion":
		if m.RiskSuggestion != "" {
			return m.RiskSuggestion
		}
	case "incident":
		if m.Incident != "" {
			return m.Incident
		}
	case "cba":
		if m.CBA != "" {
			return m.CBA
		}
	}

	if m.Default != "" {
		return m.Default
	}
	return "gpt-4o-mini"
}
