package entity

import "time"

// OperatorWorkItem is a read projection of an existing domain obligation.
type OperatorWorkItem struct {
	MitigationAction string    `json:"mitigationAction,omitempty"`
	Key              string    `json:"key"`
	Kind             string    `json:"kind"`
	TargetID         string    `json:"targetId"`
	RiskID           string    `json:"riskId"`
	RiskCode         string    `json:"riskCode"`
	RiskTitle        string    `json:"riskTitle"`
	ActionLabel      string    `json:"actionLabel"`
	Period           string    `json:"period"`
	DueDate          string    `json:"dueDate"`
	Responsibility   string    `json:"responsibility"`
	CreatedAt        time.Time `json:"createdAt"`
}

type OperatorWorkPage struct {
	Today   string             `json:"today,omitempty"`
	Total   int                `json:"total"`
	Items   []OperatorWorkItem `json:"items"`
	Page    int                `json:"page"`
	HasNext bool               `json:"hasNext"`
}

type OperatorWorkSection struct {
	Key   string             `json:"key"`
	Total int                `json:"total"`
	Items []OperatorWorkItem `json:"items"`
}
type OperatorWorkSummary struct {
	Sections []OperatorWorkSection `json:"sections"`
	Today    string                `json:"today"`
}
