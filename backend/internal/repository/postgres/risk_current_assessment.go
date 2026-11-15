package postgres

import (
	"context"
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func attachCurrentAssessments(ctx context.Context, q riskQueryer, risks []*entity.Risk) error {
	byID := make(map[uuid.UUID]*entity.Risk, len(risks))
	ids := make([]uuid.UUID, 0, len(risks))
	for _, risk := range risks {
		if risk != nil && risk.Status == entity.RiskStatusFinal {
			byID[risk.ID] = risk
			ids = append(ids, risk.ID)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	rows, err := q.Query(ctx, `SELECT DISTINCT ON(source_risk_id) source_risk_id,id,transaction_kind,observed_at::text,observed_probability,observed_impact,observed_weight,observed_nilai FROM risk_monitorings WHERE source_risk_id=ANY($1::uuid[]) AND transaction_kind='monitoring' AND status='final' AND superseded_by_monitoring_id IS NULL AND observed_at<=`+businessDateSQL+` ORDER BY source_risk_id,observed_at DESC,finalized_at DESC NULLS LAST,id DESC`, ids)
	if err != nil {
		return fmt.Errorf("read current risk assessments: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var source uuid.UUID
		var assessment entity.RiskCurrentAssessment
		if err := rows.Scan(&source, &assessment.ID, &assessment.TransactionKind, &assessment.ObservedAt, &assessment.Probability, &assessment.Impact, &assessment.Weight, &assessment.Nilai); err != nil {
			return err
		}
		assessment.InherentScore = int(math.Round(assessment.Nilai))
		byID[source].CurrentAssessment = &assessment
	}
	return rows.Err()
}
