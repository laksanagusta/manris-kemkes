package entity

import "github.com/google/uuid"

// A report profile is a configured monitoring rule and its named periods.
type UnitProgressProfile struct {
	ID        string                 `json:"id"`
	Label     string                 `json:"label"`
	Year      int                    `json:"year"`
	RuleID    *uuid.UUID             `json:"ruleId"`
	Frequency string                 `json:"frequency"`
	Periods   []MonitoringRulePeriod `json:"periods"`
}
