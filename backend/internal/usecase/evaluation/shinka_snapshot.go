package evaluation

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

// SnapshotUseCase exposes organization-period evidence without changing Manris evaluations.
type SnapshotUseCase struct {
	organizations organizationGetter
	risks         riskSummarySource
}

func NewSnapshotUseCase(organizations organizationGetter, risks riskSummarySource) *SnapshotUseCase {
	return &SnapshotUseCase{organizations: organizations, risks: risks}
}

type ShinkaRiskSnapshot struct {
	ID                    uuid.UUID `json:"id"`
	Code                  string    `json:"code"`
	Title                 string    `json:"title"`
	Category              string    `json:"category"`
	Level                 string    `json:"level"`
	ProfileCycle          string    `json:"profileCycle"`
	Probability           int       `json:"probability"`
	Impact                int       `json:"impact"`
	Nilai                 float64   `json:"nilai"`
	TargetNilai           float64   `json:"targetNilai"`
	MonitoringCycle       *string   `json:"monitoringCycle"`
	MonitoringStatus      *string   `json:"monitoringStatus"`
	BeforeMonitoringNilai *float64  `json:"beforeMonitoringNilai"`
	MonitoringResultNilai *float64  `json:"monitoringResultNilai"`
	MitigationCount       int       `json:"mitigationCount"`
}
type ShinkaSnapshotData struct {
	Organization      *entity.Organization                              `json:"organization"`
	RiskCount         int                                               `json:"riskCount"`
	Risks             []ShinkaRiskSnapshot                              `json:"risks"`
	MitigationSummary []entity.MonitoringEvaluationMitigationSummaryRow `json:"mitigationSummary"`
}
type ShinkaSnapshot struct {
	SchemaVersion  int                `json:"schemaVersion"`
	Source         string             `json:"source"`
	OrganizationID uuid.UUID          `json:"organizationId"`
	Period         string             `json:"period"`
	CapturedAt     time.Time          `json:"capturedAt"`
	SourceVersion  string             `json:"sourceVersion"`
	Data           ShinkaSnapshotData `json:"data"`
}

func (uc *SnapshotUseCase) Execute(ctx context.Context, organizationID uuid.UUID, period string) (ShinkaSnapshot, error) {
	result := ShinkaSnapshot{SchemaVersion: 1, Source: "manris-v2", OrganizationID: organizationID, Period: period}
	if organizationID == uuid.Nil || !validSnapshotPeriod(period) {
		return result, errors.ErrInvalidInput
	}
	org, err := uc.organizations.GetByID(ctx, organizationID)
	if err != nil || org == nil {
		return result, errors.ErrNotFound
	}
	risks, err := uc.risks.ListCycleSnapshot(ctx, period, []uuid.UUID{organizationID})
	if err != nil {
		return result, err
	}
	risks = compactRisks(risks)
	rows := make([]ShinkaRiskSnapshot, 0, len(risks))
	for _, risk := range risks {
		if risk.OrganizationID == nil || *risk.OrganizationID != organizationID {
			return result, errors.ErrForbidden
		}
		rows = append(rows, ShinkaRiskSnapshot{ID: risk.ID, Code: risk.Code, Title: risk.Title, Category: risk.Category, Level: risk.GetRiskLevel(), ProfileCycle: risk.AssessmentCycle, Probability: risk.Probability, Impact: risk.Impact, Nilai: risk.Nilai, TargetNilai: risk.TargetNilai, MonitoringCycle: risk.MonitoringAssessmentCycle, MonitoringStatus: risk.MonitoringStatus, BeforeMonitoringNilai: risk.BeforeMonitoringNilai, MonitoringResultNilai: risk.MonitoringResultNilai, MitigationCount: len(risk.Mitigations)})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].ID.String() < rows[j].ID.String() })
	result.Data = ShinkaSnapshotData{Organization: org, RiskCount: len(rows), Risks: rows, MitigationSummary: buildMonitoringMitigationSummary(risks)}
	encoded, err := json.Marshal(result.Data)
	if err != nil {
		return result, err
	}
	sum := sha256.Sum256(encoded)
	result.SourceVersion = hex.EncodeToString(sum[:])
	result.CapturedAt = time.Now().UTC()
	return result, nil
}
func validSnapshotPeriod(period string) bool {
	if len(period) != 7 || period[:2] != "20" || period[4:6] != "-Q" || period[6] < '1' || period[6] > '4' {
		return false
	}
	return period[2] >= '0' && period[2] <= '9' && period[3] >= '0' && period[3] <= '9'
}
