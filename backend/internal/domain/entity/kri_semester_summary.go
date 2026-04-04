package entity

import (
	"time"

	"github.com/google/uuid"
)

type KRISemesterSummary struct {
	RiskID             uuid.UUID     `json:"riskId"`
	RiskVersionGroupID uuid.UUID     `json:"riskVersionGroupId"`
	SourceCycle        string        `json:"sourceCycle"`
	KRIs               []*KRISummary `json:"kris"`
}

type KRISummary struct {
	KRIID               uuid.UUID                    `json:"kriId"`
	KRIName             string                       `json:"kriName"`
	IsArchived          bool                         `json:"isArchived"`
	LatestAcceptedValue *float64                     `json:"latestAcceptedValue,omitempty"`
	Trend               string                       `json:"trend"`
	TrendBasis          *KRIAcceptedTrendBasis       `json:"trendBasis,omitempty"`
	AcceptedCount       int                          `json:"acceptedCount"`
	OverdueCount        int                          `json:"overdueCount"`
	SkippedCount        int                          `json:"skippedCount"`
	RevisionCount       int                          `json:"revisionCount"`
	LastAcceptedReport  *KRILastAcceptedReport       `json:"lastAcceptedReport,omitempty"`
	AcceptedReports     []*KRIAcceptedReportSnapshot `json:"acceptedReports,omitempty"`
}

type KRIAcceptedTrendBasis struct {
	PreviousAcceptedValue *float64 `json:"previousAcceptedValue,omitempty"`
	LatestAcceptedValue   *float64 `json:"latestAcceptedValue,omitempty"`
	Delta                 *float64 `json:"delta,omitempty"`
}

type KRILastAcceptedReport struct {
	ReportID    uuid.UUID  `json:"reportId"`
	PeriodLabel string     `json:"periodLabel"`
	DueDate     string     `json:"dueDate"`
	ReviewedAt  *time.Time `json:"reviewedAt,omitempty"`
	Value       *float64   `json:"value,omitempty"`
}

type KRIAcceptedReportSnapshot struct {
	ReportID    uuid.UUID  `json:"reportId"`
	PeriodLabel string     `json:"periodLabel"`
	DueDate     string     `json:"dueDate"`
	ReviewedAt  *time.Time `json:"reviewedAt,omitempty"`
	Value       *float64   `json:"value,omitempty"`
}

type KRISemesterSummaryRow struct {
	KRIID               uuid.UUID
	KRIName             string
	IsArchived          bool
	ReportID            uuid.UUID
	PeriodLabel         string
	DueDate             string
	Status              string
	LatestAcceptedValue *float64
	ReviewedAt          *time.Time
}
