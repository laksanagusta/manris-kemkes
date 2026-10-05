package entity

// RiskEventDraft keeps absent facts empty until a user reviews the candidate.
type RiskEventDraft struct {
	Description           string   `json:"description"`
	OccurredAt            string   `json:"occurredAt"`
	ImpactTypes           []string `json:"impactTypes"`
	OtherImpactType       string   `json:"otherImpactType"`
	ActualImpact          string   `json:"actualImpact"`
	Severity              string   `json:"severity"`
	ImmediateResponse     string   `json:"immediateResponse"`
	PostResponseCondition string   `json:"postResponseCondition"`
	Location              string   `json:"location"`
	AffectedParties       string   `json:"affectedParties"`
	SuspectedCause        string   `json:"suspectedCause"`
	FinancialLoss         *float64 `json:"financialLoss"`
	FinancialLossKnown    *bool    `json:"financialLossKnown"`
	DisruptionDuration    string   `json:"disruptionDuration"`
	ExtraordinaryReason   string   `json:"extraordinaryReason"`
	OngoingAction         string   `json:"ongoingAction"`
}

type RiskEventExtractionItem struct {
	ClientKey     string              `json:"clientKey"`
	Event         RiskEventDraft      `json:"event"`
	SourceRefs    []DocumentSourceRef `json:"sourceRefs"`
	MissingFields []string            `json:"missingFields"`
	Confidence    int                 `json:"confidence"`
}

type RiskEventExtractionResult struct {
	Items []RiskEventExtractionItem `json:"items"`
}
