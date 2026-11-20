package postgres

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
)

const ErrAnnualProfileExists UPRWorkflowError = "Tahun ini sudah memiliki profil. Buka profil yang ada untuk melanjutkan."

type AnnualProfileListVersion struct {
	ID               uuid.UUID  `json:"id"`
	Year             int        `json:"year"`
	Version          int        `json:"version"`
	FinalizedAt      *time.Time `json:"finalizedAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	RiskCount        int        `json:"riskCount"`
	OrganizationID   uuid.UUID  `json:"organizationId"`
	OrganizationName string     `json:"organizationName"`
}

func (s *UPRWorkflow) AnnualProfileList(ctx context.Context, scope *entity.AccessScope, org uuid.UUID, includeDescendants bool) ([]AnnualProfileListVersion, error) {
	if scope == nil || !scope.CanRead(org) {
		return nil, ErrUPRNotFound
	}
	orgIDs := []uuid.UUID{org}
	if includeDescendants && scope.OrganizationID != nil && *scope.OrganizationID == org {
		if scope.IsGlobal {
			var err error
			orgIDs, err = NewOrganizationRepository(s.pool).GetDescendants(ctx, org)
			if err != nil {
				return nil, err
			}
		} else {
			orgIDs = scope.AccessibleOrgIDs
		}
	}
	rows, err := s.pool.Query(ctx, `SELECT p.id,p.year,p.version,p.finalized_at,GREATEST(p.updated_at,p.finalized_at),
		(SELECT count(*) FROM annual_risk_profile_members m WHERE m.profile_version_id=p.id),
		p.organization_id,o.name
		FROM annual_risk_profile_versions p JOIN organizations o ON o.id=p.organization_id
		WHERE p.organization_id=ANY($1::uuid[]) ORDER BY p.year DESC,o.name,p.organization_id,p.version DESC`, orgIDs)
	if err != nil {
		return nil, fmt.Errorf("list annual profile versions: %w", err)
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[AnnualProfileListVersion])
}

func (s *UPRWorkflow) DeleteAnnualDraft(ctx context.Context, org, profile uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := lockUPROrganization(ctx, tx, org); err != nil {
		return err
	}

	var finalizedAt *time.Time
	err = tx.QueryRow(ctx, `SELECT finalized_at FROM annual_risk_profile_versions
		WHERE id=$1 AND organization_id=$2 FOR UPDATE`, profile, org).Scan(&finalizedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrUPRNotFound
	}
	if err != nil {
		return err
	}
	if finalizedAt != nil {
		return UPRWorkflowError("Profil yang sudah final tidak dapat dihapus.")
	}

	var referenced bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_risk_profile_versions WHERE previous_version_id=$1)
		OR EXISTS(SELECT 1 FROM upr_report_versions WHERE profile_version_id=$1)`, profile).Scan(&referenced)
	if err != nil {
		return err
	}
	if referenced {
		return UPRWorkflowError("Profil ini sudah menjadi sumber versi atau laporan dan tidak dapat dihapus.")
	}

	deleted, err := tx.Exec(ctx, `DELETE FROM annual_risk_profile_versions
		WHERE id=$1 AND organization_id=$2 AND finalized_at IS NULL`, profile, org)
	if err != nil {
		return err
	}
	if deleted.RowsAffected() != 1 {
		return ErrUPRConflict
	}
	return tx.Commit(ctx)
}

type AnnualPickupRisk struct {
	ID             *uuid.UUID `json:"id"`
	Code           string     `json:"code"`
	Title          string     `json:"title"`
	Period         string     `json:"period"`
	AssessmentDate *string    `json:"assessmentDate"`
	Category       string     `json:"category"`
	Score          *int       `json:"score"`
	Unavailable    string     `json:"unavailable"`
}

type annualPickupRow struct {
	AnnualPickupRisk
	GroupID     uuid.UUID
	ObjectiveID *uuid.UUID
	Effective   *string
}

type AnnualProfileInitiation struct {
	MonitoringRuleID *uuid.UUID  `json:"monitoringRuleId"`
	SourceProfileID  *uuid.UUID  `json:"sourceProfileId"`
	RiskIDs          []uuid.UUID `json:"riskIds"`
}

func (s *UPRWorkflow) AnnualPickup(ctx context.Context, org uuid.UUID, year int, source *uuid.UUID) ([]AnnualPickupRisk, error) {
	rows, err := annualPickupRows(ctx, s.pool, org, year, source, nil)
	if err != nil {
		return nil, err
	}
	risks := make([]AnnualPickupRisk, 0, len(rows))
	for _, row := range rows {
		risks = append(risks, row.AnnualPickupRisk)
	}
	return risks, nil
}

// Resolve source membership against the active assessment in the same risk group.
// Final profile members with no active assessment remain visible in the preview.
func annualPickupRows(ctx context.Context, db riskQueryer, org uuid.UUID, year int, source *uuid.UUID, chosen []uuid.UUID) ([]annualPickupRow, error) {
	if source != nil {
		var found bool
		err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_risk_profile_versions
			WHERE id=$1 AND organization_id=$2 AND year<$3 AND finalized_at IS NOT NULL)`, source, org, year).Scan(&found)
		if err != nil {
			return nil, fmt.Errorf("validate source profile: %w", err)
		}
		if !found {
			return nil, ErrUPRNotFound
		}
	}
	rows, err := db.Query(ctx, annualObjectivesSQL+`, active AS (
		SELECT DISTINCT ON (r.version_group_id) r.id,r.version_group_id,r.code,r.title,r.assessment_cycle,r.nilai,r.effective_from,r.category,r.finalized_at
		FROM risks r WHERE r.organization_id=$1 AND r.status='final' AND r.is_current AND r.archived_at IS NULL
		ORDER BY r.version_group_id,r.version_number DESC,r.id DESC
	), category_history AS (
		SELECT DISTINCT ON (r.version_group_id) r.version_group_id,NULLIF(r.category,'') AS category
		FROM risks r WHERE r.organization_id=$1 AND r.status='final' AND NULLIF(r.category,'') IS NOT NULL
		ORDER BY r.version_group_id,r.version_number DESC,r.updated_at DESC,r.id DESC
	), roster AS (
		SELECT m.version_group_id,m.baseline FROM annual_risk_profile_members m WHERE m.profile_version_id=$3
		UNION ALL
		SELECT a.version_group_id,NULL::jsonb FROM active a WHERE $3::uuid IS NULL
	)
	SELECT a.id,COALESCE(a.code,roster.baseline->>'code',''),
		COALESCE(a.title,roster.baseline->>'title','Risiko tidak tersedia'),COALESCE(a.assessment_cycle,''),
		CASE WHEN a.id IS NULL THEN (roster.baseline->>'score')::int ELSE round(a.nilai)::int END,
		CASE WHEN a.id IS NULL THEN 'Diarsipkan atau tidak lagi aktif'
		WHEN a.assessment_cycle ~ '^[0-9]{4}-Q[1-4]$' AND LEFT(a.assessment_cycle,4)>$2 THEN 'Penilaian berasal dari tahun yang lebih baru'
		ELSE '' END,
		roster.version_group_id,
		(SELECT (array_agg(obj.id))[1] FROM available obj
			WHERE lower(trim(obj.title))=lower(trim(roster.baseline->>'objective')) HAVING count(*)=1),
		a.effective_from::text,
		COALESCE(a.effective_from::text,a.finalized_at::date::text,roster.baseline->>'effective_from'),
		COALESCE(NULLIF(a.category,''),NULLIF(roster.baseline->>'category',''),category_history.category,'')
	FROM roster LEFT JOIN active a USING(version_group_id)
	LEFT JOIN category_history USING(version_group_id)
	WHERE $4::uuid[] IS NULL OR a.id=ANY($4::uuid[])
	ORDER BY COALESCE(a.code,roster.baseline->>'code',''),roster.version_group_id`, org, strconv.Itoa(year), source, chosen)
	if err != nil {
		return nil, fmt.Errorf("load annual pickup candidates: %w", err)
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (annualPickupRow, error) {
		var item annualPickupRow
		err := row.Scan(&item.ID, &item.Code, &item.Title, &item.Period, &item.Score, &item.Unavailable,
			&item.GroupID, &item.ObjectiveID, &item.Effective, &item.AssessmentDate, &item.Category)
		return item, err
	})
}

func (s *UPRWorkflow) InitiateAnnualProfile(ctx context.Context, org, actor uuid.UUID, year int, input AnnualProfileInitiation) (uuid.UUID, error) {
	if input.MonitoringRuleID == nil || *input.MonitoringRuleID == uuid.Nil {
		return uuid.Nil, UPRWorkflowError("Pilih aturan pemantauan aktif untuk tahun profil.")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)
	if err := lockUPROrganization(ctx, tx, org); err != nil {
		return uuid.Nil, err
	}
	var exists bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM annual_risk_profile_versions WHERE organization_id=$1 AND year=$2)`, org, year).Scan(&exists)
	if err != nil {
		return uuid.Nil, err
	}
	if exists {
		return uuid.Nil, ErrAnnualProfileExists
	}
	if len(input.RiskIDs) == 0 {
		return uuid.Nil, UPRWorkflowError("Pilih minimal satu risiko untuk membuat draf profil.")
	}
	// Lock selected assessments before resolving the roster again. A risk archived
	// or replaced between preview and save invalidates the whole initiation.
	locked, err := tx.Query(ctx, `SELECT id FROM risks WHERE organization_id=$1 AND id=ANY($2::uuid[])
		AND status='final' AND is_current AND archived_at IS NULL ORDER BY id FOR SHARE`, org, input.RiskIDs)
	if err != nil {
		return uuid.Nil, err
	}
	ids, err := pgx.CollectRows(locked, pgx.RowTo[uuid.UUID])
	if err != nil {
		return uuid.Nil, err
	}
	if len(ids) != len(input.RiskIDs) {
		return uuid.Nil, ErrUPRConflict
	}
	picked, err := annualPickupRows(ctx, tx, org, year, input.SourceProfileID, ids)
	if err != nil {
		return uuid.Nil, err
	}
	if len(picked) != len(ids) {
		return uuid.Nil, ErrUPRConflict
	}
	for _, item := range picked {
		if item.Unavailable != "" {
			return uuid.Nil, ErrUPRConflict
		}
	}
	var profile uuid.UUID
	err = tx.QueryRow(ctx, `INSERT INTO annual_risk_profile_versions(organization_id,year,version,created_by,monitoring_rule_id)
		VALUES($1,$2,1,$3,$4) RETURNING id`, org, year, actor, input.MonitoringRuleID).Scan(&profile)
	if err != nil {
		return uuid.Nil, err
	}
	now := timeutil.BusinessNow().In(timeutil.JakartaLocation())
	yearPrefix := strconv.Itoa(year) + "-"
	batch := &pgx.Batch{}
	for _, item := range picked {
		var riskID *uuid.UUID
		effective := defaultAnnualMemberDate(year, now)
		if strings.HasPrefix(item.Period, yearPrefix) {
			riskID = item.ID
			if item.Effective != nil && strings.HasPrefix(*item.Effective, yearPrefix) {
				effective = *item.Effective
			}
		}
		batch.Queue(`INSERT INTO annual_risk_profile_members(profile_version_id,version_group_id,risk_id,source_risk_id,objective_id,effective_from)
			VALUES($1,$2,$3,$4,$5,$6::date)`, profile, item.GroupID, riskID, item.ID, item.ObjectiveID, effective)
	}
	if err := tx.SendBatch(ctx, batch).Close(); err != nil {
		return uuid.Nil, fmt.Errorf("add annual profile members: %w", err)
	}
	return profile, tx.Commit(ctx)
}

func defaultAnnualMemberDate(year int, today time.Time) string {
	switch {
	case year < today.Year():
		return fmt.Sprintf("%04d-12-31", year)
	case year > today.Year():
		return fmt.Sprintf("%04d-01-01", year)
	default:
		return today.Format(time.DateOnly)
	}
}

func touchAnnualDraft(ctx context.Context, tx pgx.Tx, id uuid.UUID) error {
	_, err := tx.Exec(ctx, `UPDATE annual_risk_profile_versions SET updated_at=now() WHERE id=$1`, id)
	return err
}
