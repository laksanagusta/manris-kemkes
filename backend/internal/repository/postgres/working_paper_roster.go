package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type rosterPeriod struct {
	SemesterStart time.Time
	SemesterEnd   time.Time
	QuarterStart  time.Time
	QuarterCycle  string
}

func resolveRosterPeriod(cycle string) (rosterPeriod, error) {
	year, half, err := parseSemester(cycle)
	if err != nil {
		return rosterPeriod{}, err
	}
	if half == 1 {
		return rosterPeriod{
			SemesterStart: time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC),
			SemesterEnd:   time.Date(year, 7, 1, 0, 0, 0, 0, time.UTC),
			QuarterStart:  time.Date(year, 4, 1, 0, 0, 0, 0, time.UTC),
			QuarterCycle:  fmt.Sprintf("%d-Q2", year),
		}, nil
	}
	return rosterPeriod{
		SemesterStart: time.Date(year, 7, 1, 0, 0, 0, 0, time.UTC),
		SemesterEnd:   time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC),
		QuarterStart:  time.Date(year, 10, 1, 0, 0, 0, 0, time.UTC),
		QuarterCycle:  fmt.Sprintf("%d-Q4", year),
	}, nil
}

func parseSemester(cycle string) (int, int, error) {
	parts := strings.SplitN(cycle, "-", 2)
	if len(parts) != 2 || (parts[1] != "H1" && parts[1] != "H2") {
		return 0, 0, fmt.Errorf("invalid assessment cycle %q, expected YYYY-H1 or YYYY-H2", cycle)
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil || year < 2000 || year > 2100 {
		return 0, 0, fmt.Errorf("invalid year in cycle %q", cycle)
	}
	var half int
	if parts[1] == "H1" {
		half = 1
	} else {
		half = 2
	}
	return year, half, nil
}

func omitemptyUUID(id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	return id.String()
}

func computeRosterRevision(entries []entity.WorkingPaperRosterEntry, quarterCycle string) string {
	h := sha256.New()

	for _, entry := range entries {
		fmt.Fprintf(h, "%s|%s|%s|%s|%s\n",
			entry.VersionGroupID,
			entry.SourceRiskID,
			omitemptyUUIDFromPtr(entry.MonitoringID),
			entry.MonitoringStatus,
			entry.RosterStatus,
		)
	}
	fmt.Fprintf(h, "%s\n", quarterCycle)

	return hex.EncodeToString(h.Sum(nil))
}

func omitemptyUUIDFromPtr(id *uuid.UUID) string {
	if id == nil || *id == uuid.Nil {
		return ""
	}
	return id.String()
}

func (r *workingPaperRepository) PreviewPeriodRoster(ctx context.Context, orgID uuid.UUID, assessmentCycle string) (*entity.WorkingPaperRosterPreview, error) {
	period, err := resolveRosterPeriod(assessmentCycle)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, rosterPreviewQuery(),
		orgID,
		period.SemesterStart,
		period.SemesterEnd,
		period.QuarterStart,
		period.QuarterCycle,
	)
	if err != nil {
		return nil, fmt.Errorf("preview period roster: %w", err)
	}
	defer rows.Close()

	entries := make([]entity.WorkingPaperRosterEntry, 0)
	summary := entity.WorkingPaperRosterSummary{}

	for rows.Next() {
		var entry entity.WorkingPaperRosterEntry
		var monitoringID, resultRiskID uuid.NullUUID
		var resultVersionNumber *int
		var monitoringStatus, monitoringCycle string

		if err := rows.Scan(
			&entry.VersionGroupID,
			&entry.Code,
			&entry.Title,
			&entry.OrganizationID,
			&entry.SourceRiskID,
			&entry.SourceVersionNumber,
			&monitoringID,
			&monitoringCycle,
			&monitoringStatus,
			&resultRiskID,
			&resultVersionNumber,
		); err != nil {
			return nil, fmt.Errorf("scan roster entry: %w", err)
		}

		entry.OrganizationID = orgID
		entry.MonitoringCycle = period.QuarterCycle

		if monitoringID.Valid {
			entry.MonitoringID = &monitoringID.UUID
			entry.MonitoringStatus = monitoringStatus
			entry.MonitoringCycle = monitoringCycle
		}
		if resultRiskID.Valid {
			entry.ResultRiskID = &resultRiskID.UUID
		}
		if resultVersionNumber != nil {
			entry.ResultVersionNumber = resultVersionNumber
		}

		entry.RosterStatus = resolveRosterStatus(entry.MonitoringID, entry.MonitoringStatus)

		entries = append(entries, entry)
		summary.EligibleCount++

		switch entry.RosterStatus {
		case entity.WorkingPaperRosterFinalizedResult:
			summary.FinalizedCount++
		case entity.WorkingPaperRosterExistingDraft:
			summary.ExistingDraftCount++
		case entity.WorkingPaperRosterDraftWillBeCreated:
			summary.NewDraftCount++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("roster preview rows: %w", err)
	}

	revision := computeRosterRevision(entries, period.QuarterCycle)

	return &entity.WorkingPaperRosterPreview{
		OrganizationID:  orgID,
		AssessmentCycle: assessmentCycle,
		MonitoringCycle: period.QuarterCycle,
		Revision:        revision,
		Entries:         entries,
		Summary:         summary,
	}, nil
}

func resolveRosterStatus(monitoringID *uuid.UUID, monitoringStatus string) string {
	if monitoringID == nil {
		return entity.WorkingPaperRosterDraftWillBeCreated
	}
	switch monitoringStatus {
	case entity.RiskMonitoringStatusFinalized:
		return entity.WorkingPaperRosterFinalizedResult
	case entity.RiskMonitoringStatusDraft:
		return entity.WorkingPaperRosterExistingDraft
	default:
		return entity.WorkingPaperRosterDraftWillBeCreated
	}
}

func rosterPreviewQuery() string {
	return `
		WITH eligible_versions AS (
			SELECT DISTINCT ON (r.version_group_id)
				r.version_group_id,
				r.id AS risk_id,
				r.code,
				r.title,
				r.version_number,
				COALESCE(r.review_approved_at, r.created_at) AS effective_from,
				r.archived_at AS effective_to
			FROM risks r
			WHERE r.organization_id = $1
			  AND r.status = 'approved'
			  AND COALESCE(r.review_approved_at, r.created_at) < $3::timestamptz
			  AND (r.archived_at IS NULL OR r.archived_at >= $2::timestamptz)
			ORDER BY r.version_group_id, r.version_number DESC
		),
		monitoring_lookup AS (
			SELECT
				rm.version_group_id,
				rm.id AS monitoring_id,
				rm.assessment_cycle AS m_cycle,
				rm.status AS m_status,
				rm.source_risk_id,
				rm.result_risk_id
			FROM risk_monitorings rm
			JOIN eligible_versions ev ON ev.version_group_id = rm.version_group_id
			WHERE rm.assessment_cycle = $5
			  AND rm.status IN ('draft', 'finalized')
		),
		result_versions AS (
			SELECT
				rr.id,
				rr.version_number,
				rr.version_group_id
			FROM risks rr
			WHERE rr.id IN (SELECT result_risk_id FROM monitoring_lookup WHERE result_risk_id IS NOT NULL)
		)
		SELECT
			ev.version_group_id,
			ev.code,
			ev.title,
			COALESCE(ml.source_risk_id, ev.risk_id) AS source_risk_id,
			ev.version_number AS source_version_number,
			ml.monitoring_id,
			ml.m_cycle AS monitoring_cycle,
			ml.m_status AS monitoring_status,
			rv.id AS result_risk_id,
			rv.version_number AS result_version_number
		FROM eligible_versions ev
		LEFT JOIN monitoring_lookup ml ON ml.version_group_id = ev.version_group_id
		LEFT JOIN result_versions rv ON rv.id = ml.result_risk_id
		ORDER BY ev.code, ev.version_group_id
	`
}
