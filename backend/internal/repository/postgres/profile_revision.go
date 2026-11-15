package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

// StartProfileRevision serializes starts on the active version. Retry opens the
// same risk draft; no monitoring transaction or reporting obligation is created.
func (r *riskRepository) StartProfileRevision(ctx context.Context, draft *entity.Risk) (*entity.Risk, bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback(ctx)
	if err := lockRiskWorkflow(ctx, tx, draft.VersionGroupID); err != nil {
		return nil, false, err
	}
	// Lock a legacy transaction before the source, matching monitoring finalization
	// lock order. Its edits become the profile draft and its row remains a link.
	legacy, legacyErr := scanRiskMonitoring(tx.QueryRow(ctx, baseRiskMonitoringSelect()+` WHERE rm.source_risk_id=$1 AND rm.transaction_kind='revision' AND rm.status='draft' FOR UPDATE OF rm`, draft.PreviousRiskID))
	if legacyErr != nil && !errors.Is(legacyErr, pgx.ErrNoRows) {
		return nil, false, legacyErr
	}
	var current bool
	if err = tx.QueryRow(ctx, `SELECT is_current AND status='final' AND archived_at IS NULL FROM risks WHERE id=$1 FOR UPDATE`, draft.PreviousRiskID).Scan(&current); err != nil {
		return nil, false, err
	}
	if !current {
		return nil, false, domainerrors.ErrSourceRiskNoLongerActive
	}
	var existing uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM risks WHERE version_group_id=$1 AND status='draft' AND previous_risk_id=$2 AND review_type='revision' ORDER BY created_at LIMIT 1`, draft.VersionGroupID, draft.PreviousRiskID).Scan(&existing)
	if err == nil {
		saved, err := (&riskRepository{pool: tx}).GetByID(ctx, existing, nil)
		return saved, true, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, false, err
	}
	drafts, err := readRiskOpenDrafts(ctx, tx, draft.VersionGroupID)
	if err != nil {
		return nil, false, err
	}
	if drafts.MonitoringID != nil {
		return nil, false, domainerrors.ErrRiskMonitoringInProgress
	}
	if drafts.RevisionRiskID != nil || (drafts.RevisionMonitoringID != nil && (legacyErr != nil || *drafts.RevisionMonitoringID != legacy.ID)) {
		return nil, false, domainerrors.ErrRiskRevisionInProgress
	}
	// Monitoring may have finalized while this request waited for the source
	// lock. Prefill its freshly committed score rather than the earlier read.
	source := &entity.Risk{ID: *draft.PreviousRiskID, Status: entity.RiskStatusFinal}
	if err := attachCurrentAssessments(ctx, tx, []*entity.Risk{source}); err != nil {
		return nil, false, err
	}
	if source.CurrentAssessment != nil {
		draft.Probability, draft.Impact = source.CurrentAssessment.Probability, source.CurrentAssessment.Impact
		draft.CalculateAll()
	}
	if legacyErr == nil {
		applyLegacyProfileRevision(draft, legacy)
	}
	if err = insertRiskWithQueryer(ctx, tx, draft); err != nil {
		return nil, false, err
	}
	if legacyErr == nil {
		if _, err = tx.Exec(ctx, `UPDATE risk_monitorings SET status='superseded',result_risk_id=$2,updated_at=now() WHERE id=$1`, legacy.ID, draft.ID); err != nil {
			return nil, false, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, false, err
	}
	return draft, legacyErr == nil, nil
}

// lockProfileRevision is called before writing a revised profile so a stale
// editor cannot supersede a newer active version or finalize the draft twice.
func lockProfileRevision(ctx context.Context, q riskQueryer, risk *entity.Risk) (bool, error) {
	if risk.ReviewType != "revision" || risk.PreviousRiskID == nil {
		return false, nil
	}
	var current bool
	if err := q.QueryRow(ctx, `SELECT is_current AND status='final' AND archived_at IS NULL FROM risks WHERE id=$1 FOR UPDATE`, risk.PreviousRiskID).Scan(&current); err != nil {
		return false, err
	}
	var state string
	if err := q.QueryRow(ctx, `SELECT status FROM risks WHERE id=$1 FOR UPDATE`, risk.ID).Scan(&state); err != nil {
		return false, err
	}
	if state == "final" {
		return true, nil
	}
	if !current {
		return false, domainerrors.ErrSourceRiskNoLongerActive
	}
	if risk.FinalizeRequested {
		drafts, err := readRiskOpenDrafts(ctx, q, risk.VersionGroupID)
		if err != nil {
			return false, err
		}
		if drafts.MonitoringID != nil {
			return false, domainerrors.ErrRiskMonitoringInProgress
		}
	}
	return false, nil
}

// recordProfileRevisionScore runs in the same transaction as version activation.
// Source values use the latest finalized observation, rather than an old baseline.
func recordProfileRevisionScore(ctx context.Context, q riskQueryer, risk *entity.Risk) error {
	if risk.ReviewType != "revision" || risk.PreviousRiskID == nil {
		return nil
	}
	_, err := q.Exec(ctx, `INSERT INTO risk_monitorings(
 source_risk_id,result_risk_id,version_group_id,assessment_cycle,status,mode,transaction_kind,
 source_probability,source_impact,source_weight,source_nilai,source_version_number,
 observed_probability,observed_impact,observed_weight,observed_nilai,observed_at,
 change_reason,started_by,finalized_by,finalized_at,draft_payload)
 SELECT source.id,$1,source.version_group_id,$2,'final','with_profile_revision','revision',
 COALESCE(latest.observed_probability,source.probability),COALESCE(latest.observed_impact,source.impact),
 COALESCE(latest.observed_weight,source.weight,1),COALESCE(latest.observed_nilai,source.nilai,0),source.version_number,
 $3,$4,$5,$6,$7::date,$8,$9,$10,COALESCE($11::timestamptz,now()),'{"observedScoreConfirmed":true}'::jsonb
 FROM risks source LEFT JOIN LATERAL (
 SELECT observed_probability,observed_impact,observed_weight,observed_nilai FROM risk_monitorings
 WHERE source_risk_id=source.id AND transaction_kind='monitoring' AND status='final'
 AND superseded_by_monitoring_id IS NULL AND observed_at<=$7::date
 ORDER BY observed_at DESC,finalized_at DESC NULLS LAST,id DESC LIMIT 1
 ) latest ON true WHERE source.id=$12
 AND (COALESCE(latest.observed_probability,source.probability)<>$3 OR COALESCE(latest.observed_impact,source.impact)<>$4)
 AND NOT EXISTS(SELECT 1 FROM risk_monitorings WHERE result_risk_id=$1 AND transaction_kind='revision' AND status='final')`,
		risk.ID, risk.AssessmentCycle, risk.Probability, risk.Impact, risk.Weight, risk.Nilai, risk.EffectiveFrom,
		risk.ChangeReason, risk.CreatedBy, risk.FinalizedBy, risk.FinalizedAt, risk.PreviousRiskID)
	if err != nil {
		return fmt.Errorf("record revision score: %w", err)
	}
	return nil
}

func applyLegacyProfileRevision(draft *entity.Risk, legacy *entity.RiskMonitoring) {
	p := legacy.DraftPayloadSnapshot()
	draft.Title, draft.Description, draft.Category = p.Title, p.Description, p.Category
	draft.Cause, draft.ImpactDesc = p.Cause, p.ImpactDesc
	draft.RiskSource, draft.Controllability = p.RiskSource, p.Controllability
	draft.ExistingControl, draft.ControlEffectiveness = p.ExistingControl, p.ControlEffectiveness
	draft.TreatmentOption = p.TreatmentOption
	draft.TargetProbability, draft.TargetImpact = p.TargetProbability, p.TargetImpact
	draft.Mitigations = p.Mitigations
	draft.Probability, draft.Impact = legacy.ObservedProbability, legacy.ObservedImpact
	draft.ChangeReason, draft.ReviewSummary = legacy.ChangeReason, legacy.Conclusion
	if legacy.StartedBy != nil {
		draft.CreatedBy = legacy.StartedBy
	}
	draft.CalculateAll()
}
