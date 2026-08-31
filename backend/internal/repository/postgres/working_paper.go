package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// workingPaperRepository is the PostgreSQL implementation of repository.WorkingPaperRepository
type workingPaperRepository struct {
	pool *pgxpool.Pool
}

type workingPaperReader interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
}

type workingPaperExecer interface {
	Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error)
}

type workingPaperTx interface {
	workingPaperExecer
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// NewWorkingPaperRepository creates a new working paper repository
func NewWorkingPaperRepository(pool *pgxpool.Pool) repository.WorkingPaperRepository {
	return &workingPaperRepository{pool: pool}
}

// finalizedWorkingPaperRiskExpr returns the base field value since reviewed_* columns no longer exist
// After Task 2, effective scores = base scores for all risks
func finalizedWorkingPaperRiskExpr(alias, baseField string) string {
	return fmt.Sprintf(`%[1]s.%[2]s`, alias, baseField)
}

func previousApprovedWorkingPaperRiskExpr() string {
	return `(
		SELECT prev.id FROM risks prev
		WHERE prev.version_group_id = risk.version_group_id
		  AND prev.version_number < risk.version_number
		  AND prev.status = 'final'
		ORDER BY
		  CASE
		    WHEN COALESCE(prev.assessment_cycle, '') = CASE
	      WHEN risk.assessment_cycle ~ '^\d{4}-Q[1-4]$' THEN
		        CONCAT(
		          CASE
	            WHEN RIGHT(risk.assessment_cycle, 2) = 'Q1'
		              THEN ((LEFT(risk.assessment_cycle, 4))::int - 1)::text
		            ELSE LEFT(risk.assessment_cycle, 4)
		          END,
	          '-Q',
		          CASE
	            WHEN RIGHT(risk.assessment_cycle, 2) = 'Q1' THEN '4'
	            ELSE ((RIGHT(risk.assessment_cycle, 1))::int - 1)::text
		          END
		        )
		      ELSE ''
		    END THEN 0
		    ELSE 1
		  END,
		  prev.version_number DESC
		LIMIT 1
	)`
}

func previousApprovedWorkingPaperJoinExpr() string {
	return `LEFT JOIN LATERAL (
		SELECT
			prev.id,
			prev.probability,
			prev.impact,
			prev.weight,
			prev.nilai,
			ROUND(COALESCE(prev.nilai, 0))::int,
			prev.risk_appetite,
			prev.treatment_option,
			prev.existing_control,
			prev.control_effectiveness,
			prev.target_probability,
			prev.target_impact,
			prev.target_weight,
			prev.target_nilai,
			ROUND(COALESCE(prev.target_nilai, 0))::int,
			prev.cause,
			prev.risk_source,
			prev.controllability,
			prev.impact_description
		FROM risks prev
		WHERE prev.version_group_id = risk.version_group_id
		  AND prev.version_number < risk.version_number
		  AND prev.status = 'final'
		ORDER BY
		  CASE
		    WHEN COALESCE(prev.assessment_cycle, '') = CASE
	      WHEN risk.assessment_cycle ~ '^\d{4}-Q[1-4]$' THEN
		        CONCAT(
		          CASE
	            WHEN RIGHT(risk.assessment_cycle, 2) = 'Q1'
		              THEN ((LEFT(risk.assessment_cycle, 4))::int - 1)::text
		            ELSE LEFT(risk.assessment_cycle, 4)
		          END,
	          '-Q',
		          CASE
	            WHEN RIGHT(risk.assessment_cycle, 2) = 'Q1' THEN '4'
	            ELSE ((RIGHT(risk.assessment_cycle, 1))::int - 1)::text
		          END
		        )
		      ELSE ''
		    END THEN 0
		    ELSE 1
		  END,
		  prev.version_number DESC
		LIMIT 1
	) prev_risk ON TRUE`
}

func workingPaperMonitoringExpr() string {
	return `LEFT JOIN LATERAL (
		SELECT
			rm.id,
			rm.status,
			rm.assessment_cycle,
			rm.source_probability,
			rm.source_impact,
			rm.source_weight,
			rm.source_nilai,
			rm.source_level,
			rm.observed_probability,
			rm.observed_impact,
			rm.observed_weight,
			rm.observed_nilai,
			rm.observed_level,
			rm.mitigation_completion_percent,
			rm.mitigation_progress_summary,
			rm.started_at,
			rm.updated_at,
			rm.finalized_at
		FROM risk_monitorings rm
		JOIN risks monitoring_source ON monitoring_source.id = rm.source_risk_id
		WHERE monitoring_source.version_group_id = risk.version_group_id
		  AND rm.assessment_cycle = wp.assessment_cycle
		  AND rm.status IN ('draft', 'final')
		ORDER BY CASE rm.status WHEN 'final' THEN 0 ELSE 1 END, rm.updated_at DESC, rm.id DESC
		LIMIT 1
	) monitoring ON TRUE`
}

func (r *workingPaperRepository) getWorkingPaperRisks(ctx context.Context, q workingPaperReader, wpID uuid.UUID) ([]entity.WorkingPaperRiskLink, error) {
	probabilityExpr := finalizedWorkingPaperRiskExpr("risk", "probability")
	impactExpr := finalizedWorkingPaperRiskExpr("risk", "impact")
	weightExpr := finalizedWorkingPaperRiskExpr("risk", "weight")
	nilaiExpr := finalizedWorkingPaperRiskExpr("risk", "nilai")

	// Prefer the latest final risk from the previous quarter.
	// If none exists, fall back to the latest approved version below the active one.
	query := fmt.Sprintf(`SELECT wpr.id, wpr.working_paper_id, wpr.risk_id, wpr.sort_order, wpr.source_mode, wpr.created_at,
		       COALESCE(wpr.version_group_id, risk.version_group_id), COALESCE(wpr.source_risk_id, wpr.risk_id), COALESCE(monitoring.id, wpr.monitoring_id), wpr.result_risk_id,
		       risk.id, risk.code, risk.title, risk.description, risk.category, risk.status,
		       COALESCE(org.name, ''),
		       %s AS probability,
		       %s AS impact,
		       %s AS bobot,
		       %s AS nilai,
		       ROUND(COALESCE(risk.nilai, 0))::int,
		       COALESCE(risk.cause, ARRAY[]::text[]),
		       COALESCE(risk.risk_source, ''),
		       COALESCE(risk.controllability, ''),
		       COALESCE(risk.impact_description, ARRAY[]::text[]),
		       COALESCE(risk.existing_control, ''),
		       COALESCE(risk.control_effectiveness, ''),
		       COALESCE(risk.risk_appetite, ''),
		       COALESCE(risk.treatment_option, ''),
		       COALESCE((SELECT array_agg(m.action ORDER BY m.sort_order) FROM mitigations m WHERE m.risk_id = risk.id), ARRAY[]::text[]),
		       COALESCE((SELECT array_agg(m.due_date::text ORDER BY m.sort_order) FROM mitigations m WHERE m.risk_id = risk.id AND m.due_date IS NOT NULL), ARRAY[]::text[]),
		       COALESCE((SELECT array_agg(concat_ws(' · ',
		       	'Aksi: ' || m.action,
		       	CASE WHEN btrim(COALESCE(m.mitigation_type, '')) <> '' THEN 'Jenis: ' || m.mitigation_type END,
		       	CASE WHEN btrim(COALESCE(m.activity_stage, '')) <> '' THEN 'Tahap: ' || m.activity_stage END,
		       	CASE WHEN btrim(COALESCE(m.expected_output, '')) <> '' THEN 'Output: ' || m.expected_output END,
		       	CASE WHEN btrim(COALESCE(m.quantitative_target, '')) <> '' THEN 'Target: ' || m.quantitative_target END,
		       	CASE WHEN btrim(COALESCE(m.supporting_unit, '')) <> '' THEN 'Unit: ' || m.supporting_unit END,
		       	CASE WHEN btrim(COALESCE(m.resources_required, '')) <> '' THEN 'Sumber daya: ' || m.resources_required END,
		       	CASE WHEN btrim(COALESCE(m.contingency_plan, '')) <> '' THEN 'Kontinjensi: ' || m.contingency_plan END,
		       	CASE WHEN btrim(COALESCE(m.potential_obstacle, '')) <> '' THEN 'Hambatan: ' || m.potential_obstacle END,
		       	CASE WHEN m.is_breakthrough_activity THEN 'Breakthrough: Ya' END,
		       	CASE WHEN m.is_existing_control THEN 'Kontrol eksisting: Ya' END
		       ) ORDER BY m.sort_order) FROM mitigations m WHERE m.risk_id = risk.id), ARRAY[]::text[]),
		       risk.target_probability,
		       risk.target_impact,
		       risk.target_weight,
		       risk.target_nilai,
		       ROUND(COALESCE(risk.target_nilai, 0))::int,
		       COALESCE(risk.assessment_cycle, ''),
		       risk.version_number,
		       COALESCE(source_risk.next_review_date::text, ''),
		       COALESCE((SELECT string_agg(CONCAT(u.name, ' (', u.role, ')'), ', ' ORDER BY m.sort_order) FROM mitigations m JOIN users u ON u.id = m.owner_user_id WHERE m.risk_id = risk.id AND m.owner_user_id IS NOT NULL), ''),
		       -- Previous quarter snapshot
		       prev_risk.id AS prev_id,
		       COALESCE(prev_risk.probability, 0),
		       COALESCE(prev_risk.impact, 0),
		       COALESCE(prev_risk.weight, 0),
		       COALESCE(prev_risk.nilai, 0),
		       ROUND(COALESCE(prev_risk.nilai, 0))::int,
		       COALESCE(prev_risk.risk_appetite, ''),
		       COALESCE(prev_risk.treatment_option, ''),
		       COALESCE(prev_risk.existing_control, ''),
		       COALESCE(prev_risk.control_effectiveness, ''),
		       COALESCE(prev_risk.target_probability, 0),
		       COALESCE(prev_risk.target_impact, 0),
		       COALESCE(prev_risk.target_weight, 0),
		       COALESCE(prev_risk.target_nilai, 0),
		       ROUND(COALESCE(prev_risk.target_nilai, 0))::int,
		       COALESCE(prev_risk.cause, ARRAY[]::text[]),
		       COALESCE(prev_risk.risk_source, ''),
		       COALESCE(prev_risk.controllability, ''),
		       COALESCE(prev_risk.impact_description, ARRAY[]::text[]),
		       COALESCE((SELECT array_agg(pm.action ORDER BY pm.sort_order) FROM mitigations pm WHERE pm.risk_id = prev_risk.id), ARRAY[]::text[]),
		       COALESCE((SELECT array_agg(pm.due_date::text ORDER BY pm.sort_order) FROM mitigations pm WHERE pm.risk_id = prev_risk.id AND pm.due_date IS NOT NULL), ARRAY[]::text[]),
		       COALESCE((SELECT array_agg(concat_ws(' · ',
		       	'Aksi: ' || pm.action,
		       	CASE WHEN btrim(COALESCE(pm.mitigation_type, '')) <> '' THEN 'Jenis: ' || pm.mitigation_type END,
		       	CASE WHEN btrim(COALESCE(pm.activity_stage, '')) <> '' THEN 'Tahap: ' || pm.activity_stage END,
		       	CASE WHEN btrim(COALESCE(pm.expected_output, '')) <> '' THEN 'Output: ' || pm.expected_output END,
		       	CASE WHEN btrim(COALESCE(pm.quantitative_target, '')) <> '' THEN 'Target: ' || pm.quantitative_target END,
		       	CASE WHEN btrim(COALESCE(pm.supporting_unit, '')) <> '' THEN 'Unit: ' || pm.supporting_unit END,
		       	CASE WHEN btrim(COALESCE(pm.resources_required, '')) <> '' THEN 'Sumber daya: ' || pm.resources_required END,
		       	CASE WHEN btrim(COALESCE(pm.contingency_plan, '')) <> '' THEN 'Kontinjensi: ' || pm.contingency_plan END,
		       	CASE WHEN btrim(COALESCE(pm.potential_obstacle, '')) <> '' THEN 'Hambatan: ' || pm.potential_obstacle END,
		       	CASE WHEN pm.is_breakthrough_activity THEN 'Breakthrough: Ya' END,
		       	CASE WHEN pm.is_existing_control THEN 'Kontrol eksisting: Ya' END
		       ) ORDER BY pm.sort_order) FROM mitigations pm WHERE pm.risk_id = prev_risk.id), ARRAY[]::text[]),
		       -- Monitoring data
		       monitoring.id,
		       COALESCE(monitoring.status, ''),
		       COALESCE(monitoring.assessment_cycle, ''),
		       COALESCE(monitoring.source_probability, 0),
		       COALESCE(monitoring.source_impact, 0),
		       COALESCE(monitoring.source_weight, 0),
		       COALESCE(monitoring.source_nilai, 0),
		       COALESCE(monitoring.source_level, ''),
		       COALESCE(monitoring.observed_probability, 0),
		       COALESCE(monitoring.observed_impact, 0),
		       COALESCE(monitoring.observed_weight, 0),
		       COALESCE(monitoring.observed_nilai, 0),
			   COALESCE(monitoring.observed_level, ''),
			   COALESCE(monitoring.mitigation_completion_percent, 0),
			   COALESCE(monitoring.mitigation_progress_summary, ''),
		       monitoring.started_at,
		       monitoring.updated_at,
		       monitoring.finalized_at
		FROM working_paper_risks wpr
		INNER JOIN working_papers wp ON wp.id = wpr.working_paper_id
		INNER JOIN risks risk ON risk.id = wpr.risk_id
		LEFT JOIN risks source_risk ON source_risk.id = COALESCE(wpr.source_risk_id, wpr.risk_id)
		LEFT JOIN organizations org ON org.id = risk.organization_id
		%s
		%s
		WHERE wpr.working_paper_id = $1
		ORDER BY wpr.sort_order, wpr.created_at, wpr.id`, probabilityExpr, impactExpr, weightExpr, nilaiExpr, previousApprovedWorkingPaperJoinExpr(), workingPaperMonitoringExpr())

	rows, err := q.Query(ctx, query, wpID)
	if err != nil {
		return nil, fmt.Errorf("get working paper risks: %w", err)
	}
	defer rows.Close()

	links := make([]entity.WorkingPaperRiskLink, 0)
	for rows.Next() {
		var link entity.WorkingPaperRiskLink
		var versionNumber int
		var jadwalPelaksanaan, penanggungJawab string
		var prevID *uuid.UUID
		var prevProbability, prevImpact int
		var prevWeight, prevNilai float64
		var prevInherentScore int
		var prevRiskAppetite, prevTreatmentOption, prevExistingControl, prevControlEffectiveness string
		var prevTargetProbability, prevTargetImpact int
		var prevTargetWeight, prevTargetNilai float64
		var prevTargetScore int
		var prevCause, prevImpactDesc []string
		var prevRiskSource, prevControllability string
		var monitoringID *uuid.UUID
		var monitoringStatus, monitoringCycle string
		var monitoringSourceProbability, monitoringSourceImpact int
		var monitoringSourceWeight, monitoringSourceNilai float64
		var monitoringSourceLevel string
		var monitoringObservedProbability, monitoringObservedImpact int
		var monitoringObservedWeight, monitoringObservedNilai float64
		var monitoringObservedLevel string
		var monitoringCompletionPercent int
		var monitoringProgressSummary string
		var monitoringStartedAt, monitoringUpdatedAt, monitoringFinalizedAt *time.Time

		// Nullable fields that may be empty arrays from COALESCE
		var nullableCause, nullableImpactDesc, nullableMitigations, nullableMitigationDueDates []string
		var nullableMitigationDetails []string
		var nullablePrevMitigations, nullablePrevMitigationDueDates []string
		var nullablePrevMitigationDetails []string

		if err := rows.Scan(
			&link.ID,
			&link.WorkingPaperID,
			&link.RiskID,
			&link.SortOrder,
			&link.SourceMode,
			&link.CreatedAt,
			&link.VersionGroupID,
			&link.SourceRiskID,
			&link.MonitoringID,
			&link.ResultRiskID,
			&link.Risk.ID,
			&link.Risk.Code,
			&link.Risk.Title,
			&link.Risk.Description,
			&link.Risk.Category,
			&link.Risk.Status,
			&link.Risk.OrgName,
			&link.Risk.Probability,
			&link.Risk.Impact,
			&link.Risk.Bobot,
			&link.Risk.Nilai,
			&link.Risk.InherentScore,
			&nullableCause,
			&link.Risk.RiskSource,
			&link.Risk.Controllability,
			&nullableImpactDesc,
			&link.Risk.ExistingControl,
			&link.Risk.ControlEffectiveness,
			&link.Risk.RiskAppetite,
			&link.Risk.TreatmentOption,
			&nullableMitigations,
			&nullableMitigationDueDates,
			&nullableMitigationDetails,
			&link.Risk.TargetProbability,
			&link.Risk.TargetImpact,
			&link.Risk.TargetBobot,
			&link.Risk.TargetNilai,
			&link.Risk.TargetScore,
			&link.Risk.AssessmentCycle,
			&versionNumber,
			&jadwalPelaksanaan,
			&penanggungJawab,
			// Previous quarter
			&prevID,
			&prevProbability,
			&prevImpact,
			&prevWeight,
			&prevNilai,
			&prevInherentScore,
			&prevRiskAppetite,
			&prevTreatmentOption,
			&prevExistingControl,
			&prevControlEffectiveness,
			&prevTargetProbability,
			&prevTargetImpact,
			&prevTargetWeight,
			&prevTargetNilai,
			&prevTargetScore,
			&prevCause,
			&prevRiskSource,
			&prevControllability,
			&prevImpactDesc,
			&nullablePrevMitigations,
			&nullablePrevMitigationDueDates,
			&nullablePrevMitigationDetails,
			// Monitoring
			&monitoringID,
			&monitoringStatus,
			&monitoringCycle,
			&monitoringSourceProbability,
			&monitoringSourceImpact,
			&monitoringSourceWeight,
			&monitoringSourceNilai,
			&monitoringSourceLevel,
			&monitoringObservedProbability,
			&monitoringObservedImpact,
			&monitoringObservedWeight,
			&monitoringObservedNilai,
			&monitoringObservedLevel,
			&monitoringCompletionPercent,
			&monitoringProgressSummary,
			&monitoringStartedAt,
			&monitoringUpdatedAt,
			&monitoringFinalizedAt,
		); err != nil {
			return nil, fmt.Errorf("scan working paper risk: %w", err)
		}

		// Assign nullable arrays
		link.Risk.Cause = nullableCause
		link.Risk.ImpactDesc = nullableImpactDesc
		link.Risk.Mitigations = nullableMitigations
		link.Risk.MitigationDueDates = nullableMitigationDueDates
		link.Risk.MitigationDetails = nullableMitigationDetails
		link.Risk.VersionNumber = versionNumber
		link.Risk.PreviousRiskID = prevID
		link.Risk.JadwalPelaksanaan = jadwalPelaksanaan
		link.Risk.PenanggungJawab = penanggungJawab

		// Previous quarter snapshot
		if prevID != nil {
			prev := &entity.WorkingPaperRiskSnapshot{
				Probability:          prevProbability,
				Impact:               prevImpact,
				Bobot:                prevWeight,
				Nilai:                prevNilai,
				InherentScore:        prevInherentScore,
				Cause:                prevCause,
				RiskSource:           prevRiskSource,
				Controllability:      prevControllability,
				ImpactDesc:           prevImpactDesc,
				RiskAppetite:         prevRiskAppetite,
				TreatmentOption:      prevTreatmentOption,
				ExistingControl:      prevExistingControl,
				ControlEffectiveness: prevControlEffectiveness,
				TargetProbability:    prevTargetProbability,
				TargetImpact:         prevTargetImpact,
				TargetBobot:          prevTargetWeight,
				TargetNilai:          prevTargetNilai,
				TargetScore:          prevTargetScore,
				Mitigations:          nullablePrevMitigations,
				MitigationDueDates:   nullablePrevMitigationDueDates,
			}
			prev.Normalize()
			prev.MitigationDetails = nullablePrevMitigationDetails
			link.Risk.Previous = prev
		}

		if monitoringID != nil {
			observedScore := monitoringObservedNilai
			if monitoringObservedProbability > 0 && monitoringObservedImpact > 0 && observedScore == 0 {
				observedScore = float64(int(math.Round(monitoringObservedNilai)))
			}
			if observedScore == 0 && monitoringObservedProbability > 0 && monitoringObservedImpact > 0 {
				observedScore = float64(monitoringObservedProbability * monitoringObservedImpact)
			}

			link.Risk.Monitoring = &entity.WorkingPaperRiskMonitoring{
				ID:                          *monitoringID,
				Status:                      monitoringStatus,
				AssessmentCycle:             monitoringCycle,
				SourceProbability:           monitoringSourceProbability,
				SourceImpact:                monitoringSourceImpact,
				SourceWeight:                monitoringSourceWeight,
				SourceNilai:                 monitoringSourceNilai,
				SourceLevel:                 monitoringSourceLevel,
				ObservedProbability:         monitoringObservedProbability,
				ObservedImpact:              monitoringObservedImpact,
				ObservedWeight:              monitoringObservedWeight,
				ObservedNilai:               monitoringObservedNilai,
				ObservedLevel:               monitoringObservedLevel,
				MitigationCompletionPercent: monitoringCompletionPercent,
				MitigationProgressSummary:   monitoringProgressSummary,
				StartedAt:                   time.Time{},
				UpdatedAt:                   time.Time{},
				FinalizedAt:                 monitoringFinalizedAt,
			}
			if monitoringStartedAt != nil {
				link.Risk.Monitoring.StartedAt = monitoringStartedAt.UTC()
			}
			if monitoringUpdatedAt != nil {
				link.Risk.Monitoring.UpdatedAt = monitoringUpdatedAt.UTC()
			}

			link.Risk.MonitoringP = monitoringObservedProbability
			link.Risk.MonitoringD = monitoringObservedImpact
			link.Risk.MonitoringBobot = monitoringObservedWeight
			link.Risk.MonitoringNilai = monitoringObservedNilai
			link.Risk.MonitoringInherentScore = int(math.Round(observedScore))
			link.Risk.MonitoringTingkatRisiko = monitoringObservedLevel
			if link.Risk.MonitoringTingkatRisiko == "" && observedScore > 0 {
				link.Risk.MonitoringTingkatRisiko = entity.GetRiskLevelFromNilai(observedScore)
			}
			link.Risk.MonitoringTingkatRisikoDisplay = entity.GetRiskLevelDisplay(link.Risk.MonitoringTingkatRisiko)
		}

		link.Risk.NormalizeDerivedScores()
		links = append(links, link)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate working paper risks: %w", err)
	}

	return links, nil
}

func (r *workingPaperRepository) getSignatoriesByWorkingPaperID(ctx context.Context, q workingPaperReader, wpID uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	rows, err := q.Query(ctx,
		`SELECT id, working_paper_id, user_id, sequence_no, signer_name, signer_nip,
		        signer_jabatan, signer_pangkat, status, signed_at, qr_code_png, qr_data
		 FROM working_paper_signatories
		 WHERE working_paper_id = $1
		 ORDER BY sequence_no`, wpID,
	)
	if err != nil {
		return nil, fmt.Errorf("get signatories by working paper id: %w", err)
	}
	defer rows.Close()

	var sigs []*entity.WorkingPaperSignatory
	for rows.Next() {
		sig := &entity.WorkingPaperSignatory{}
		var qrCodePNG *string
		var qrData []byte

		if err := rows.Scan(
			&sig.ID, &sig.WorkingPaperID, &sig.UserID, &sig.SequenceNo,
			&sig.SignerName, &sig.SignerNIP, &sig.SignerJabatan, &sig.SignerPangkat,
			&sig.Status, &sig.SignedAt, &qrCodePNG, &qrData,
		); err != nil {
			return nil, fmt.Errorf("scan signatory: %w", err)
		}

		if qrCodePNG != nil {
			sig.QRCodePNG = *qrCodePNG
		}
		if len(qrData) > 0 {
			sig.QRData = json.RawMessage(qrData)
		}

		sigs = append(sigs, sig)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate signatories: %w", err)
	}

	return sigs, nil
}

func (r *workingPaperRepository) loadWorkingPaper(ctx context.Context, q workingPaperReader, id uuid.UUID, forUpdate bool) (*entity.WorkingPaper, error) {
	query := `SELECT id, sequence_no, code, title, org_id, status, assessment_cycle, document_hash, current_signatory_sequence, created_by,
	        created_at, updated_at, completed_at, cancelled_at, tte_skipped
	 FROM working_papers
	 WHERE id = $1`
	if forUpdate {
		query += ` FOR UPDATE`
	}

	wp := &entity.WorkingPaper{}
	err := q.QueryRow(ctx, query, id).Scan(
		&wp.ID, &wp.SequenceNo, &wp.Code, &wp.Title, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
		&wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
		&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt, &wp.TTESkipped,
	)
	if err != nil {
		return nil, fmt.Errorf("get working paper by id: %w", err)
	}

	risks, err := r.getWorkingPaperRisks(ctx, q, wp.ID)
	if err != nil {
		return nil, fmt.Errorf("get working paper risks: %w", err)
	}
	wp.Risks = risks

	sigs, err := r.getSignatoriesByWorkingPaperID(ctx, q, wp.ID)
	if err != nil {
		return nil, fmt.Errorf("get working paper signatories: %w", err)
	}
	for _, sig := range sigs {
		wp.Signatories = append(wp.Signatories, *sig)
	}

	return wp, nil
}

func (r *workingPaperRepository) updateWorkingPaper(ctx context.Context, execer workingPaperExecer, wp *entity.WorkingPaper) error {
	_, err := execer.Exec(ctx,
		`UPDATE working_papers
		 SET status = $2, current_signatory_sequence = $3, completed_at = $4,
		     cancelled_at = $5, tte_skipped = $6, updated_at = NOW()
		 WHERE id = $1`,
		wp.ID, wp.Status, wp.CurrentSignatorySequence, wp.CompletedAt, wp.CancelledAt, wp.TTESkipped,
	)
	if err != nil {
		return fmt.Errorf("update working paper: %w", err)
	}
	return nil
}

func (r *workingPaperRepository) updateSignatory(ctx context.Context, execer workingPaperExecer, sig *entity.WorkingPaperSignatory) error {
	_, err := execer.Exec(ctx,
		`UPDATE working_paper_signatories
		 SET status = $2, signed_at = $3, qr_code_png = $4, qr_data = $5
		 WHERE id = $1`,
		sig.ID, sig.Status, sig.SignedAt, sig.QRCodePNG, sig.QRData,
	)
	if err != nil {
		return fmt.Errorf("update signatory: %w", err)
	}
	return nil
}

func insertWorkingPaperRiskLinks(ctx context.Context, execer workingPaperExecer, wp *entity.WorkingPaper) error {
	for i := range wp.Risks {
		link := &wp.Risks[i]
		if link.CreatedAt.IsZero() {
			link.CreatedAt = wp.CreatedAt
		}
		_, err := execer.Exec(ctx,
			`INSERT INTO working_paper_risks (working_paper_id, risk_id, sort_order, source_mode, created_at)
			 VALUES ($1, $2, $3, $4, $5)`,
			wp.ID, link.RiskID, link.SortOrder, link.SourceMode, link.CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("create working paper risk link: %w", err)
		}
		link.WorkingPaperID = wp.ID
	}
	return nil
}

func insertWorkingPaperSignatories(ctx context.Context, tx workingPaperTx, wp *entity.WorkingPaper) error {
	for i := range wp.Signatories {
		sig := &wp.Signatories[i]
		var createdAt interface{}
		err := tx.QueryRow(ctx,
			`INSERT INTO working_paper_signatories (working_paper_id, user_id, sequence_no, signer_name,
			        signer_nip, signer_jabatan, signer_pangkat, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 RETURNING id, created_at`,
			wp.ID, sig.UserID, sig.SequenceNo, sig.SignerName,
			sig.SignerNIP, sig.SignerJabatan, sig.SignerPangkat, sig.Status,
		).Scan(&sig.ID, &createdAt)
		if err != nil {
			return fmt.Errorf("create working paper signatory: %w", err)
		}
		sig.WorkingPaperID = wp.ID
	}
	return nil
}

func lockOrganizationForWorkingPaperSequence(ctx context.Context, q workingPaperTx, orgID uuid.UUID) error {
	var lockedID uuid.UUID
	if err := q.QueryRow(ctx, `
		SELECT id
		FROM organizations
		WHERE id = $1
		FOR UPDATE
	`, orgID).Scan(&lockedID); err != nil {
		return fmt.Errorf("lock organization for working paper sequence: %w", err)
	}
	return nil
}

func assignNextWorkingPaperSequence(ctx context.Context, q workingPaperTx, wp *entity.WorkingPaper) error {
	var nextSequence int
	if err := q.QueryRow(ctx, `
		SELECT COALESCE(MAX(sequence_no), 0) + 1
		FROM working_papers
		WHERE org_id = $1
	`, wp.OrgID).Scan(&nextSequence); err != nil {
		return fmt.Errorf("get next working paper sequence: %w", err)
	}

	wp.SequenceNo = nextSequence
	wp.Code = formatWorkingPaperCode(nextSequence)
	return nil
}

func formatWorkingPaperCode(sequenceNo int) string {
	return fmt.Sprintf("WP-%04d", sequenceNo)
}

// Create inserts a new working paper and its signatories in a transaction
func (r *workingPaperRepository) Create(ctx context.Context, wp *entity.WorkingPaper) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("create working paper begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockOrganizationForWorkingPaperSequence(ctx, tx, wp.OrgID); err != nil {
		return err
	}
	if err := assignNextWorkingPaperSequence(ctx, tx, wp); err != nil {
		return err
	}

	err = tx.QueryRow(ctx,
		`INSERT INTO working_papers (sequence_no, code, title, org_id, status, assessment_cycle,
		        document_hash, current_signatory_sequence, created_by, tte_skipped)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, created_at, updated_at`,
		wp.SequenceNo, wp.Code, wp.Title, wp.OrgID, wp.Status, wp.AssessmentCycle,
		wp.DocumentHash, wp.CurrentSignatorySequence, wp.CreatedBy, wp.TTESkipped,
	).Scan(&wp.ID, &wp.CreatedAt, &wp.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create working paper insert: %w", err)
	}

	if err := insertWorkingPaperRiskLinks(ctx, tx, wp); err != nil {
		return err
	}

	if err := insertWorkingPaperSignatories(ctx, tx, wp); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("create working paper commit: %w", err)
	}

	return nil
}

// GetByID retrieves a working paper by ID including its signatories
func (r *workingPaperRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.WorkingPaper, error) {
	return r.loadWorkingPaper(ctx, r.pool, id, false)
}

// List retrieves working papers with optional filters and pagination
func (r *workingPaperRepository) List(ctx context.Context, orgIDs []uuid.UUID, status, query, assessmentCycle, createdAt string, page, limit int) ([]*entity.WorkingPaper, int, error) {
	countQuery := `SELECT COUNT(*) FROM working_papers WHERE 1=1`
	dataQuery := `SELECT id, sequence_no, code, title, org_id, status, assessment_cycle,
	                     document_hash, current_signatory_sequence, created_by,
	                     created_at, updated_at, completed_at, cancelled_at, tte_skipped
	              FROM working_papers WHERE 1=1`

	args := []interface{}{}
	argIdx := 1

	if len(orgIDs) > 0 {
		filter := fmt.Sprintf(" AND org_id = ANY($%d)", argIdx)
		countQuery += filter
		dataQuery += filter
		args = append(args, uuidArrayToStrings(orgIDs))
		argIdx++
	}

	if status != "" && status != "all" {
		filter := fmt.Sprintf(" AND status = $%d", argIdx)
		countQuery += filter
		dataQuery += filter
		args = append(args, status)
		argIdx++
	}

	if query != "" {
		filter := fmt.Sprintf(" AND (COALESCE(code, '') ILIKE $%d OR COALESCE(title, '') ILIKE $%d)", argIdx, argIdx)
		countQuery += filter
		dataQuery += filter
		args = append(args, "%"+query+"%")
		argIdx++
	}

	if assessmentCycle != "" {
		filter := fmt.Sprintf(" AND assessment_cycle = $%d", argIdx)
		countQuery += filter
		dataQuery += filter
		args = append(args, assessmentCycle)
		argIdx++
	}

	if createdAt != "" {
		filter := fmt.Sprintf(" AND created_at::date = $%d::date", argIdx)
		countQuery += filter
		dataQuery += filter
		args = append(args, createdAt)
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list working papers count: %w", err)
	}

	offset := (page - 1) * limit
	dataQuery += " ORDER BY created_at DESC, id DESC"
	dataQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list working papers query: %w", err)
	}
	defer rows.Close()

	var papers []*entity.WorkingPaper
	for rows.Next() {
		wp := &entity.WorkingPaper{}

		if err := rows.Scan(
			&wp.ID, &wp.SequenceNo, &wp.Code, &wp.Title, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
			&wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
			&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt, &wp.TTESkipped,
		); err != nil {
			return nil, 0, fmt.Errorf("list working papers scan: %w", err)
		}

		risks, err := r.getWorkingPaperRisks(ctx, r.pool, wp.ID)
		if err != nil {
			return nil, 0, fmt.Errorf("list working papers get risks: %w", err)
		}
		wp.Risks = risks

		sigs, err := r.getSignatoriesByWorkingPaperID(ctx, r.pool, wp.ID)
		if err != nil {
			return nil, 0, fmt.Errorf("list working papers get signatories: %w", err)
		}
		for _, sig := range sigs {
			wp.Signatories = append(wp.Signatories, *sig)
		}

		papers = append(papers, wp)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list working papers rows: %w", err)
	}

	return papers, total, nil
}

// Update updates a working paper's mutable fields
func (r *workingPaperRepository) Update(ctx context.Context, wp *entity.WorkingPaper) error {
	return r.updateWorkingPaper(ctx, r.pool, wp)
}

// Delete deletes a working paper by ID (cascade handles signatories)
func (r *workingPaperRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM working_papers WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete working paper: %w", err)
	}
	return nil
}

func (r *workingPaperRepository) MutateByIDForUpdate(ctx context.Context, id uuid.UUID, mutate func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("mutate working paper begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	wp, err := r.loadWorkingPaper(ctx, tx, id, true)
	if err != nil {
		return nil, fmt.Errorf("mutate working paper load locked row: %w", err)
	}

	if err := mutate(wp); err != nil {
		return nil, err
	}

	for i := range wp.Signatories {
		if err := r.updateSignatory(ctx, tx, &wp.Signatories[i]); err != nil {
			return nil, err
		}
	}
	if err := r.updateWorkingPaper(ctx, tx, wp); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("mutate working paper commit: %w", err)
	}

	return wp, nil
}

// GetSignatoriesByWorkingPaperID retrieves all signatories for a working paper
func (r *workingPaperRepository) GetSignatoriesByWorkingPaperID(ctx context.Context, wpID uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	return r.getSignatoriesByWorkingPaperID(ctx, r.pool, wpID)
}

// UpdateSignatory updates a signatory's status and signing data
func (r *workingPaperRepository) UpdateSignatory(ctx context.Context, sig *entity.WorkingPaperSignatory) error {
	return r.updateSignatory(ctx, r.pool, sig)
}

// GetPendingSigningByUserID retrieves working papers pending the given user's signature
func (r *workingPaperRepository) GetPendingSigningByUserID(ctx context.Context, userID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.WorkingPaper, error) {
	query := `SELECT wp.id, wp.sequence_no, wp.code, wp.title, wp.org_id, wp.status, wp.assessment_cycle,
		        wp.document_hash, wp.current_signatory_sequence, wp.created_by,
		        wp.created_at, wp.updated_at, wp.completed_at, wp.cancelled_at, wp.tte_skipped
		 FROM working_papers wp
		 INNER JOIN working_paper_signatories wps ON wps.working_paper_id = wp.id
		 WHERE wp.status = 'signing'
		   AND wps.user_id = $1
		   AND wps.sequence_no = wp.current_signatory_sequence + 1
		   AND wps.status = 'pending'`

	args := []interface{}{userID}
	argIdx := 2

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND wp.org_id = ANY($%d)", argIdx)
		args = append(args, uuidArrayToStrings(orgIDs))
		argIdx++
	}

	query += " ORDER BY wp.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("get pending signing by user id: %w", err)
	}
	defer rows.Close()

	var papers []*entity.WorkingPaper
	for rows.Next() {
		wp := &entity.WorkingPaper{}

		if err := rows.Scan(
			&wp.ID, &wp.SequenceNo, &wp.Code, &wp.Title, &wp.OrgID, &wp.Status, &wp.AssessmentCycle,
			&wp.DocumentHash, &wp.CurrentSignatorySequence, &wp.CreatedBy,
			&wp.CreatedAt, &wp.UpdatedAt, &wp.CompletedAt, &wp.CancelledAt, &wp.TTESkipped,
		); err != nil {
			return nil, fmt.Errorf("scan pending signing working paper: %w", err)
		}

		risks, err := r.getWorkingPaperRisks(ctx, r.pool, wp.ID)
		if err != nil {
			return nil, fmt.Errorf("pending signing get risks: %w", err)
		}
		wp.Risks = risks

		sigs, err := r.getSignatoriesByWorkingPaperID(ctx, r.pool, wp.ID)
		if err != nil {
			return nil, fmt.Errorf("pending signing get signatories: %w", err)
		}
		for _, sig := range sigs {
			wp.Signatories = append(wp.Signatories, *sig)
		}

		papers = append(papers, wp)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pending signing: %w", err)
	}

	return papers, nil
}

// CountPendingSigningByUserID returns the count of working papers pending the given user's signature
func (r *workingPaperRepository) CountPendingSigningByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*)
		 FROM working_papers wp
		 INNER JOIN working_paper_signatories wps ON wps.working_paper_id = wp.id
		 WHERE wp.status = 'signing'
		   AND wps.user_id = $1
		   AND wps.sequence_no = wp.current_signatory_sequence + 1
		   AND wps.status = 'pending'`, userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count pending signing by user id: %w", err)
	}
	return count, nil
}

func (r *workingPaperRepository) CountByOrgAndCycle(ctx context.Context, orgID uuid.UUID, cycle string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM working_papers WHERE org_id = $1 AND assessment_cycle = $2`,
		orgID, cycle,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count working papers by org and cycle: %w", err)
	}
	return count, nil
}

func (r *workingPaperRepository) HasBlockingDocumentLink(ctx context.Context, riskID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS (
			SELECT 1
			FROM working_paper_risks wpr
			INNER JOIN working_papers wp ON wp.id = wpr.working_paper_id
			WHERE wpr.risk_id = $1
			  AND wp.status IN ('signing', 'completed')
		)`,
		riskID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check blocking document link: %w", err)
	}

	return exists, nil
}
