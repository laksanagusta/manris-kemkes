package entity

import "time"

// OperatorWorkItem is a read projection of an existing domain obligation.
type OperatorWorkItem struct {
	Key            string    `json:"key"`
	Kind           string    `json:"kind"`
	TargetID       string    `json:"targetId"`
	RiskID         string    `json:"riskId"`
	RiskCode       string    `json:"riskCode"`
	RiskTitle      string    `json:"riskTitle"`
	ActionLabel    string    `json:"actionLabel"`
	Period         string    `json:"period"`
	DueDate        string    `json:"dueDate"`
	Responsibility string    `json:"responsibility"`
	CreatedAt      time.Time `json:"createdAt"`
}

type OperatorWorkPage struct {
	Items   []OperatorWorkItem `json:"items"`
	Page    int                `json:"page"`
	HasNext bool               `json:"hasNext"`
}
