package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/timeutil"
)

type UPRWorkflow struct {
	pool *pgxpool.Pool
}

func NewUPRWorkflow(pool *pgxpool.Pool) *UPRWorkflow {
	return &UPRWorkflow{pool: pool}
}

// UPRWorkflowError is a validation failure safe to display to the requester.
type UPRWorkflowError string

func (e UPRWorkflowError) Error() string { return string(e) }

const (
	ErrUPRNotFound    UPRWorkflowError = "Data tidak ditemukan."
	ErrUPRConflict    UPRWorkflowError = "Data sudah berubah. Muat ulang halaman dan coba lagi."
	ErrUPRNoRecipient UPRWorkflowError = "Organisasi ini belum memiliki induk UPR-T.I untuk menerima laporan."
)

type AnnualProfileVersion struct {
	MonitoringRuleID *uuid.UUID `json:"monitoringRuleId"`
	ID               uuid.UUID  `json:"id"`
	Version          int        `json:"version"`
	FinalizedAt      *time.Time `json:"finalizedAt"`
	FinalizedBy      *uuid.UUID `json:"finalizedBy"`
}

type AnnualProfileMember struct {
	GroupID       uuid.UUID       `json:"groupId"`
	RiskID        *uuid.UUID      `json:"riskId"`
	SourceRiskID  *uuid.UUID      `json:"sourceRiskId"`
	ObjectiveID   *uuid.UUID      `json:"objectiveId"`
	EffectiveFrom string          `json:"effectiveFrom"`
	ChangeReason  string          `json:"changeReason"`
	Baseline      json.RawMessage `json:"baseline"`
	Code          string          `json:"code"`
	Title         string          `json:"title"`
	RiskStatus    string          `json:"riskStatus"`
	Score         *int            `json:"score"`
	CanRemove     bool            `json:"canRemove"`
}

type AnnualProfileObjective struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}

type AnnualProfileCandidate struct {
	ID                   uuid.UUID  `json:"id"`
	GroupID              uuid.UUID  `json:"groupId"`
	Code                 string     `json:"code"`
	Title                string     `json:"title"`
	Period               string     `json:"period"`
	Score                int        `json:"score"`
	Source               string     `json:"source"`
	SuggestedObjectiveID *uuid.UUID `json:"suggestedObjectiveId"`
}

type AnnualProfile struct {
	OrganizationID uuid.UUID                `json:"organizationId"`
	Versions       []AnnualProfileVersion   `json:"versions"`
	Selected       *AnnualProfileVersion    `json:"selected"`
	Members        []AnnualProfileMember    `json:"members"`
	Objectives     []AnnualProfileObjective `json:"objectives"`
}

type AnnualMemberInput struct {
	RiskID          uuid.UUID  `json:"riskId"`
	ObjectiveID     *uuid.UUID `json:"objectiveId"`
	EffectiveFrom   string     `json:"effectiveFrom"`
	ChangeReason    string     `json:"changeReason"`
	Reassess        bool       `json:"reassess"`
	DeferAssessment bool       `json:"deferAssessment"`
}

const annualVersionColumns = "monitoring_rule_id, id, version, finalized_at, finalized_by"

func (s *UPRWorkflow) AnnualProfile(ctx context.Context, org uuid.UUID, year int, id uuid.UUID) (AnnualProfile, error) {
	out := AnnualProfile{OrganizationID: org, Versions: []AnnualProfileVersion{}, Members: []AnnualProfileMember{}, Objectives: []AnnualProfileObjective{}}
	rows, err := s.pool.Query(ctx, `SELECT `+annualVersionColumns+` FROM annual_risk_profile_versions WHERE organization_id=$1 AND year=$2 ORDER BY version DESC`, org, year)
	if err != nil {
		return out, err
	}
	out.Versions, err = pgx.CollectRows(rows, pgx.RowToStructByPos[AnnualProfileVersion])
	if err != nil {
		return out, err
	}
	for _, v := range out.Versions {
		if id == uuid.Nil || id == v.ID {
			out.Selected = &v
			break
		}
	}
	if id != uuid.Nil && out.Selected == nil {
		return out, ErrUPRNotFound
	}
	if out.Selected != nil {
		rows, err = s.pool.Query(ctx, `SELECT m.version_group_id,m.risk_id,m.source_risk_id,m.objective_id,m.effective_from::text,m.change_reason,m.baseline,
			COALESCE(m.baseline->>'code',r.code,src.code,''),COALESCE(m.baseline->>'title',r.title,src.title,''),
			COALESCE(r.status,''),COALESCE((m.baseline->>'score')::int,CASE WHEN r.status='final' THEN round(r.nilai)::int END),
			p.finalized_at IS NULL AND previous.version_group_id IS NULL
			FROM annual_risk_profile_members m LEFT JOIN risks r ON r.id=m.risk_id LEFT JOIN risks src ON src.id=m.source_risk_id
			JOIN annual_risk_profile_versions p ON p.id=m.profile_version_id
			LEFT JOIN annual_risk_profile_members previous ON previous.profile_version_id=p.previous_version_id AND previous.version_group_id=m.version_group_id
			WHERE m.profile_version_id=$1 ORDER BY COALESCE(m.baseline->>'code',r.code,src.code,''),m.version_group_id`, out.Selected.ID)
		if err != nil {
			return out, err
		}
		out.Members, err = pgx.CollectRows(rows, pgx.RowToStructByPos[AnnualProfileMember])
		if err != nil {
			return out, err
		}
	}
	rows, err = s.pool.Query(ctx, annualObjectivesSQL+` SELECT id,title FROM available ORDER BY title,id`, org, strconv.Itoa(year))
	if err != nil {
		return out, err
	}
	out.Objectives, err = pgx.CollectRows(rows, pgx.RowToStructByPos[AnnualProfileObjective])
	return out, err
}

// Shared plans expose objectives through the same RO assignments used by the risk form.
const annualObjectivesSQL = `WITH available AS (
	SELECT obj.id,obj.title FROM planning_objectives obj
	JOIN planning_goals goal ON goal.id=obj.goal_id
	JOIN planning plan ON plan.id=goal.planning_id
	JOIN organizations org ON org.id=$1
	WHERE plan.period=$2 AND plan.status='active'
	AND (plan.organization_id=$1 OR goal.organization_id=$1 OR EXISTS (
			SELECT 1 FROM planning_ikus iku
			JOIN planning_programs prog ON prog.iku_id=iku.id
			JOIN planning_activities act ON act.program_id=prog.id
			JOIN planning_ros ro ON ro.activity_id=act.id
			WHERE iku.objective_id=obj.id AND (ro.scope_mode='all_satker' OR EXISTS (
				SELECT 1 FROM planning_ro_scopes scope WHERE scope.ro_id=ro.id
				AND (scope.organization_id=$1 OR (scope.organization_category<>'' AND scope.organization_category=org.upr_level))
			))
	))
)`

func (s *UPRWorkflow) AnnualCandidates(ctx context.Context, org uuid.UUID, year int) ([]AnnualProfileCandidate, error) {
	rows, err := s.pool.Query(ctx, annualObjectivesSQL+`, prior AS (
		SELECT id FROM annual_risk_profile_versions WHERE organization_id=$1 AND year=$2::int-1 AND finalized_at IS NOT NULL
		ORDER BY version DESC LIMIT 1
	), historical AS (
		SELECT DISTINCT ON (r.version_group_id) r.version_group_id,r.archived_at
		FROM risks r WHERE r.organization_id=$1 AND r.status='final' AND r.superseded_by_risk_id IS NULL
		AND `+riskEffectiveAtSQL+` < (make_date($2::int,1,1)::timestamp AT TIME ZONE 'Asia/Jakarta')
		AND COALESCE(r.finalized_at,r.review_approved_at,r.created_at) < (make_date($2::int,1,1)::timestamp AT TIME ZONE 'Asia/Jakarta')
		ORDER BY r.version_group_id,`+riskEffectiveAtSQL+` DESC,r.version_number DESC,r.id DESC
	), candidates AS (
		SELECT DISTINCT ON (r.version_group_id) r.id,r.version_group_id,COALESCE(r.code,'') AS code,
		r.title,COALESCE(r.assessment_cycle,'') AS period,round(COALESCE(r.nilai,0))::int AS score,
		CASE WHEN m.version_group_id IS NOT NULL THEN 'prior_profile'
		WHEN prior.id IS NULL AND h.version_group_id IS NOT NULL
			AND COALESCE(event.action<>'archive',h.archived_at IS NULL OR h.archived_at>=make_date($2::int,1,1)::timestamp AT TIME ZONE 'Asia/Jakarta') THEN 'year_end_register'
		WHEN LEFT(r.assessment_cycle,4)=$2 THEN 'current_year'
		ELSE 'other_active' END AS source,
		(SELECT (array_agg(obj.id))[1] FROM available obj
			WHERE lower(trim(obj.title))=lower(trim(m.baseline->>'objective')) HAVING count(*)=1) AS suggested_objective_id
		FROM risks r LEFT JOIN prior ON TRUE
		LEFT JOIN annual_risk_profile_members m ON m.profile_version_id=prior.id AND m.version_group_id=r.version_group_id
		LEFT JOIN historical h ON h.version_group_id=r.version_group_id
		LEFT JOIN LATERAL (
			SELECT a.action FROM audit_logs a JOIN risks version ON version.id=a.entity_id
			WHERE prior.id IS NULL AND h.version_group_id IS NOT NULL AND version.organization_id=$1 AND version.version_group_id=r.version_group_id
			AND a.entity_type='risk' AND a.action IN ('archive','restore')
			AND a.created_at < (make_date($2::int,1,1)::timestamp AT TIME ZONE 'Asia/Jakarta')
			ORDER BY a.created_at DESC,a.id DESC LIMIT 1
		) event ON TRUE
		WHERE r.organization_id=$1 AND r.status='final' AND r.is_current AND r.archived_at IS NULL
		ORDER BY r.version_group_id,r.version_number DESC,r.id DESC
	) SELECT * FROM candidates ORDER BY CASE source WHEN 'prior_profile' THEN 0 WHEN 'year_end_register' THEN 0 WHEN 'current_year' THEN 1 ELSE 2 END,code,id`, org, strconv.Itoa(year))
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[AnnualProfileCandidate])
}

func lockUPROrganization(ctx context.Context, tx pgx.Tx, org uuid.UUID) error {
	var id uuid.UUID
	return tx.QueryRow(ctx, `SELECT id FROM organizations WHERE id=$1 FOR UPDATE`, org).Scan(&id)
}

func (s *UPRWorkflow) CreateAnnualDraft(ctx context.Context, org, actor uuid.UUID, year int) (uuid.UUID, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)
	if err = lockUPROrganization(ctx, tx, org); err != nil {
		return uuid.Nil, err
	}
	var id, previous uuid.UUID
	var version int
	var finalizedAt *time.Time
	err = tx.QueryRow(ctx, `SELECT id,version,finalized_at FROM annual_risk_profile_versions WHERE organization_id=$1 AND year=$2 ORDER BY version DESC LIMIT 1`, org, year).Scan(&previous, &version, &finalizedAt)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return id, err
	}
	if previous == uuid.Nil {
		return uuid.Nil, UPRWorkflowError("Mulai profil tahunan dengan memilih aturan pemantauan dan risiko terlebih dahulu.")
	}
	if previous != uuid.Nil && finalizedAt == nil {
		return previous, nil
	}
	err = tx.QueryRow(ctx, `INSERT INTO annual_risk_profile_versions(organization_id,year,version,previous_version_id,created_by,monitoring_rule_id) VALUES($1,$2,$3,NULLIF($4::uuid,$5::uuid),$6,(SELECT monitoring_rule_id FROM annual_risk_profile_versions WHERE id=$4)) RETURNING id`,
		org, year, version+1, previous, uuid.Nil, actor).Scan(&id)
	if err != nil {
		return id, err
	}
	if previous != uuid.Nil {
		_, err = tx.Exec(ctx, `INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,source_risk_id,objective_id,effective_from,change_reason,baseline)
			SELECT $1,version_group_id,risk_id,source_risk_id,objective_id,effective_from,change_reason,baseline FROM annual_risk_profile_members WHERE profile_version_id=$2`, id, previous)
		if err != nil {
			return id, err
		}
	}
	return id, tx.Commit(ctx)
}

func lockAnnualDraft(ctx context.Context, tx pgx.Tx, org, id uuid.UUID) (int, error) {
	var year int
	var finalized *time.Time
	err := tx.QueryRow(ctx, `SELECT year,finalized_at FROM annual_risk_profile_versions WHERE id=$1 AND organization_id=$2 FOR UPDATE`, id, org).Scan(&year, &finalized)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrUPRNotFound
	}
	if err == nil && finalized != nil {
		return 0, ErrUPRConflict
	}
	return year, err
}

func (s *UPRWorkflow) SaveAnnualMember(ctx context.Context, org, actor, profile uuid.UUID, input AnnualMemberInput) (uuid.UUID, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)
	year, err := lockAnnualDraft(ctx, tx, org, profile)
	if err != nil {
		return uuid.Nil, err
	}
	var group uuid.UUID
	var status, cycle string
	var current bool
	var riskEffective *string
	err = tx.QueryRow(ctx, `SELECT version_group_id,status,COALESCE(assessment_cycle,''),is_current,effective_from::text
		FROM risks WHERE id=$1 AND organization_id=$2
		AND (archived_at IS NULL OR archived_reason='superseded by periodic reassessment')`, input.RiskID, org).Scan(&group, &status, &cycle, &current, &riskEffective)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrUPRNotFound
	}
	if err != nil {
		return uuid.Nil, err
	}
	if input.DeferAssessment {
		if status != "final" || !current || input.Reassess {
			return uuid.Nil, ErrUPRConflict
		}
		var locked uuid.UUID
		err := tx.QueryRow(ctx, `SELECT id FROM risks WHERE id=$1 AND organization_id=$2
			AND status='final' AND is_current AND archived_at IS NULL FOR SHARE`, input.RiskID, org).Scan(&locked)
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrUPRConflict
		}
		if err != nil {
			return uuid.Nil, err
		}
		// Pickup only records membership. Historical assessments are completed
		// from the profile detail, where correction dates and reasons are reviewed.
		picked, err := annualPickupRows(ctx, tx, org, year, nil, []uuid.UUID{input.RiskID})
		if err != nil {
			return uuid.Nil, err
		}
		if len(picked) != 1 || picked[0].Unavailable != "" {
			return uuid.Nil, ErrUPRConflict
		}
		var assessment *uuid.UUID
		date := defaultAnnualMemberDate(year, timeutil.BusinessNow().In(timeutil.JakartaLocation()))
		if strings.HasPrefix(cycle, strconv.Itoa(year)+"-") {
			assessment = &input.RiskID
			if riskEffective != nil && strings.HasPrefix(*riskEffective, strconv.Itoa(year)+"-") {
				date = *riskEffective
			}
		}
		added, err := tx.Exec(ctx, `INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,source_risk_id,effective_from)
			VALUES($1,$2,$3,$4,$5::date) ON CONFLICT(profile_version_id,version_group_id) DO NOTHING`, profile, group, assessment, input.RiskID, date)
		if err != nil {
			return uuid.Nil, err
		}
		if added.RowsAffected() > 0 {
			if err := touchAnnualDraft(ctx, tx, profile); err != nil {
				return uuid.Nil, err
			}
		}
		return input.RiskID, tx.Commit(ctx)
	}
	var oldID, source, oldObjective *uuid.UUID
	var oldDate, oldReason string
	var baseline json.RawMessage
	err = tx.QueryRow(ctx, `SELECT risk_id,source_risk_id,objective_id,effective_from::text,change_reason,baseline FROM annual_risk_profile_members
		WHERE profile_version_id=$1 AND version_group_id=$2`, profile, group).Scan(&oldID, &source, &oldObjective, &oldDate, &oldReason, &baseline)
	existing := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, err
	}
	if input.ObjectiveID != nil {
		var ok bool
		err = tx.QueryRow(ctx, annualObjectivesSQL+` SELECT EXISTS(SELECT 1 FROM available WHERE id=$3)`, org, strconv.Itoa(year), input.ObjectiveID).Scan(&ok)
		if err != nil {
			return uuid.Nil, err
		}
		if !ok {
			return uuid.Nil, UPRWorkflowError("Pilih sasaran aktif untuk UPR dan tahun profil ini.")
		}
	}
	sameAssessment := existing && !input.Reassess && oldID != nil && *oldID == input.RiskID
	sameObjective := (oldObjective == nil && input.ObjectiveID == nil) ||
		(oldObjective != nil && input.ObjectiveID != nil && *oldObjective == *input.ObjectiveID)
	today := timeutil.BusinessNow().In(timeutil.JakartaLocation())
	date := strings.TrimSpace(input.EffectiveFrom)
	if date == "" {
		switch {
		case sameAssessment && sameObjective:
			date = oldDate
		case riskEffective != nil && strings.HasPrefix(*riskEffective, strconv.Itoa(year)+"-") && !input.Reassess:
			date = *riskEffective
		default:
			date = defaultAnnualMemberDate(year, today)
		}
	}
	effective, err := time.Parse(time.DateOnly, date)
	if err != nil || effective.Year() != year {
		return uuid.Nil, UPRWorkflowError("Tanggal berlaku harus berada dalam tahun profil.")
	}
	reason := strings.TrimSpace(input.ChangeReason)
	if reason == "" && sameAssessment && sameObjective && date == oldDate {
		reason = oldReason
	}
	if len([]rune(reason)) > 2000 {
		return uuid.Nil, UPRWorkflowError("Alasan perubahan maksimal 2.000 karakter.")
	}
	if (existing && len(baseline) > 0 && (!sameAssessment || !sameObjective || date != oldDate)) ||
		(riskEffective != nil && date < *riskEffective) || (input.Reassess && date < today.Format(time.DateOnly)) {
		if reason == "" {
			return uuid.Nil, UPRWorkflowError("Isi alasan perubahan atau koreksi sebelum menyimpan.")
		}
	}
	riskID := input.RiskID
	if sameAssessment && sameObjective && date == oldDate && reason == oldReason {
		return riskID, nil
	}
	if input.Reassess {
		if status != "final" || !current {
			return uuid.Nil, UPRWorkflowError("Gunakan asesmen final aktif untuk penilaian ulang.")
		}
		if source == nil {
			source = &input.RiskID
		}
		riskID, err = s.reserveAnnualAssessment(ctx, tx, org, actor, input.RiskID, group, year, today, reason)
		if err != nil {
			return uuid.Nil, err
		}
	} else if status != "final" && (!existing || oldID == nil || *oldID != riskID) {
		return uuid.Nil, UPRWorkflowError("Pilih asesmen final atau mulai penilaian ulang dari profil.")
	}
	// A member can adopt the group's latest final version even when its
	// assessment cycle is from an earlier year ("gunakan versi terakhir").
	// Anything else that is not the profile year's cycle must be re-assessed.
	if !input.Reassess && !strings.HasPrefix(cycle, strconv.Itoa(year)+"-") && (status != "final" || !current) {
		return uuid.Nil, UPRWorkflowError("Nilai ulang risiko untuk tahun profil sebelum menyimpannya.")
	}
	_, err = tx.Exec(ctx, `INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,source_risk_id,objective_id,effective_from,change_reason)
		VALUES($1,$2,$3,$4,$5,$6::date,$7)
		ON CONFLICT(profile_version_id,version_group_id) DO UPDATE SET risk_id=EXCLUDED.risk_id,
		source_risk_id=EXCLUDED.source_risk_id,objective_id=EXCLUDED.objective_id,effective_from=EXCLUDED.effective_from,
		change_reason=EXCLUDED.change_reason,baseline=NULL`, profile, group, riskID, source, input.ObjectiveID, date, reason)
	if err != nil {
		return uuid.Nil, err
	}
	if err := touchAnnualDraft(ctx, tx, profile); err != nil {
		return uuid.Nil, err
	}
	return riskID, tx.Commit(ctx)
}

func (s *UPRWorkflow) reserveAnnualAssessment(ctx context.Context, tx pgx.Tx, org, actor, sourceID, group uuid.UUID, year int, now time.Time, reason string) (uuid.UUID, error) {
	var current uuid.UUID
	err := tx.QueryRow(ctx, `SELECT id FROM risks WHERE organization_id=$1 AND version_group_id=$2 AND status='final'
		AND is_current AND archived_at IS NULL ORDER BY version_number DESC LIMIT 1 FOR UPDATE`, org, group).Scan(&current)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && current != sourceID) {
		return uuid.Nil, ErrUPRConflict
	}
	if err != nil {
		return uuid.Nil, err
	}
	quarter := (int(now.Month())-1)/3 + 1
	if year < now.Year() {
		quarter = 4
	}
	if year > now.Year() {
		quarter = 1
	}
	cycle := fmt.Sprintf("%d-Q%d", year, quarter)
	var draft uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM risks WHERE organization_id=$1 AND version_group_id=$2 AND status='draft'
		AND assessment_cycle=$3 AND previous_risk_id=$4 ORDER BY version_number DESC LIMIT 1`, org, group, cycle, sourceID).Scan(&draft)
	if err == nil {
		return draft, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, err
	}
	source, err := (&riskRepository{pool: tx}).GetByID(ctx, sourceID, []uuid.UUID{org})
	if err != nil {
		return uuid.Nil, err
	}
	if source.AssessmentCycle > cycle && strings.Contains(source.AssessmentCycle, "-Q") {
		return uuid.Nil, UPRWorkflowError("Risiko sudah memiliki asesmen di periode yang lebih baru.")
	}
	cloned := cloneRiskForPeriodicReassessment(source, cycle, now.UTC())
	cloned.CreatedBy = &actor
	cloned.FinalizedBy = nil
	cloned.FinalizedAt = nil
	cloned.EffectiveFrom = nil
	cloned.ChangeReason = reason
	cloned.ReviewSummary = ""
	if err := insertRiskWithQueryer(ctx, tx, cloned); err != nil {
		return uuid.Nil, err
	}
	return cloned.ID, nil
}

func (s *UPRWorkflow) RemoveAnnualMember(ctx context.Context, org, profile, group uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = lockAnnualDraft(ctx, tx, org, profile); err != nil {
		return err
	}
	var prior bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_risk_profile_versions p JOIN annual_risk_profile_members m
		ON m.profile_version_id=p.previous_version_id WHERE p.id=$1 AND m.version_group_id=$2)`, profile, group).Scan(&prior)
	if err != nil {
		return err
	}
	if prior {
		return UPRWorkflowError("Risiko dari profil final sebelumnya tidak dapat dilepas dari draf revisi ini.")
	}
	removed, err := tx.Exec(ctx, `DELETE FROM annual_risk_profile_members WHERE profile_version_id=$1 AND version_group_id=$2`, profile, group)
	if err != nil {
		return err
	}
	if removed.RowsAffected() > 0 {
		if err := touchAnnualDraft(ctx, tx, profile); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *UPRWorkflow) FinalizeAnnualProfile(ctx context.Context, org, actor, profile uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	year, err := lockAnnualDraft(ctx, tx, org, profile)
	if errors.Is(err, ErrUPRConflict) {
		return nil
	}
	if err != nil {
		return err
	}
	var emptyConfigured bool
	if err := tx.QueryRow(ctx, `SELECT monitoring_rule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM annual_risk_profile_members WHERE profile_version_id=$1) FROM annual_risk_profile_versions WHERE id=$1`, profile).Scan(&emptyConfigured); err != nil {
		return err
	}
	if emptyConfigured {
		return UPRWorkflowError("Pilih minimal satu risiko sebelum finalisasi profil.")
	}
	rows, err := tx.Query(ctx, `SELECT r.id FROM risks r JOIN annual_risk_profile_members m ON m.risk_id=r.id
		WHERE m.profile_version_id=$1 AND m.baseline IS NULL ORDER BY r.id FOR SHARE OF r`, profile)
	if err != nil {
		return err
	}
	if _, err = pgx.CollectRows(rows, pgx.RowTo[uuid.UUID]); err != nil {
		return err
	}
	var invalid bool
	err = tx.QueryRow(ctx, ` SELECT EXISTS(
		SELECT 1 FROM annual_risk_profile_members m LEFT JOIN risks r ON r.id=m.risk_id
		WHERE m.profile_version_id=$3 AND m.baseline IS NULL AND (r.id IS NULL OR r.status<>'final'
			OR r.organization_id IS DISTINCT FROM $1
			OR (r.archived_at IS NOT NULL AND r.archived_reason<>'superseded by periodic reassessment')
			OR (LEFT(r.assessment_cycle,4) IS DISTINCT FROM $2 AND NOT (
				r.is_current AND r.version_group_id=m.version_group_id
			)))
	)`, org, strconv.Itoa(year), profile).Scan(&invalid)
	if err != nil {
		return err
	}
	if invalid {
		return UPRWorkflowError("Finalkan penilaian untuk setiap risiko dalam profil.")
	}
	_, err = tx.Exec(ctx, annualObjectivesSQL+` UPDATE annual_risk_profile_members m SET baseline=to_jsonb(r) || jsonb_build_object(
		'riskId',r.id,'code',COALESCE(r.code,''),'title',r.title,'category',r.category,'description',r.description,
		'probability',r.probability,'impact',r.impact,'score',round(r.nilai)::int,'value',r.nilai,
		'targetScore',round(r.target_nilai)::int,'objective',(SELECT obj.title FROM available obj WHERE obj.id=m.objective_id),'existingControl',r.existing_control,
		'mitigations',COALESCE((SELECT jsonb_agg(to_jsonb(plan) ORDER BY plan.sort_order,plan.id) FROM mitigations plan WHERE plan.risk_id=r.id),'[]'::jsonb)
	),objective_id=CASE WHEN EXISTS(SELECT 1 FROM available obj WHERE obj.id=m.objective_id) THEN m.objective_id ELSE NULL END
	FROM risks r WHERE m.profile_version_id=$3 AND m.baseline IS NULL AND r.id=m.risk_id`, org, strconv.Itoa(year), profile)
	if err != nil {
		return err
	}
	var unfrozen bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_risk_profile_members WHERE profile_version_id=$1 AND baseline IS NULL)`, profile).Scan(&unfrozen); err != nil {
		return err
	}
	if unfrozen {
		return ErrUPRConflict
	}
	if _, err = tx.Exec(ctx, `UPDATE annual_risk_profile_versions SET finalized_at=$2,finalized_by=$3,updated_at=now() WHERE id=$1`, profile, timeutil.BusinessNow().UTC(), actor); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
