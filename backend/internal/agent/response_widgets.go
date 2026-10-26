package agent

// Actions are constructed by application tools, never from model HTML or code.
// Prompts preserve IDs/scope/period, while tools recheck current authorization.
type WidgetAction struct {
	Label  string   `json:"label"`
	Prompt string   `json:"prompt"`
	Skills []string `json:"skills"`
}
type RiskDetail struct {
	ID             string           `json:"id"`
	Code           string           `json:"code"`
	Title          string           `json:"title"`
	Score          *int             `json:"score"`
	Level          string           `json:"level"`
	Status         string           `json:"status"`
	Cycle          string           `json:"cycle"`
	OrganizationID string           `json:"organizationId"`
	Href           string           `json:"href"`
	Causes         []string         `json:"causes"`
	Impacts        []string         `json:"impacts"`
	Control        string           `json:"control"`
	Mitigations    []RiskMitigation `json:"mitigations"`
	Actions        []WidgetAction   `json:"actions"`
}
type RiskMitigation struct {
	Action  string `json:"action"`
	Owner   string `json:"owner"`
	DueDate string `json:"dueDate"`
}
type PriorityTask struct {
	ID      string `json:"id"`
	Action  string `json:"action"`
	Owner   string `json:"owner"`
	DueDate string `json:"dueDate"`
	Href    string `json:"href"`
}
type PriorityRisk struct {
	Risk         RiskDetail     `json:"risk"`
	Tasks        []PriorityTask `json:"tasks"`
	OverdueDays  int            `json:"overdueDays"`
	OverdueCount int            `json:"overdueCount"`
}
type PriorityList struct {
	Items []PriorityRisk `json:"items"`
	Total int            `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
	Cycle string         `json:"cycle"`
}
type ComparisonRow struct {
	Label    string `json:"label"`
	Current  *int   `json:"current"`
	Previous *int   `json:"previous"`
	Delta    *int   `json:"delta"`
}
type PeriodComparison struct {
	Cycle           string          `json:"cycle"`
	ComparisonCycle string          `json:"comparisonCycle"`
	Rows            []ComparisonRow `json:"rows"`
	Warnings        []string        `json:"warnings"`
	Href            string          `json:"href"`
}
