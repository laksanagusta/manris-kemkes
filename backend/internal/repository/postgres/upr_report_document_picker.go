package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type UPRReportDocumentOption struct {
	ID           uuid.UUID  `json:"id"`
	Kind         string     `json:"kind"`
	Title        string     `json:"title"`
	Code         string     `json:"code"`
	DocumentDate *string    `json:"documentDate"`
	FinalizedAt  *time.Time `json:"finalizedAt"`
	Period       string     `json:"period,omitempty"`
}

type UPRReportDocumentPage struct {
	Items   []UPRReportDocumentOption `json:"items"`
	HasMore bool                      `json:"hasMore"`
}

const reportDocumentOptionsSQL = `
	WITH sources AS (
		SELECT p.id, 'profile' AS kind, format('Profil %s v%s',p.year,p.version) AS title,
		       format('Versi %s',p.version) AS code, (p.finalized_at AT TIME ZONE 'Asia/Jakarta')::date AS document_date,
		       p.finalized_at, p.version AS rank, '' AS legacy_period, NULL::uuid AS monitoring_period_id
		FROM annual_risk_profile_versions p
		WHERE ($2='' OR $2='profile') AND p.organization_id=$1 AND p.year=$3 AND p.finalized_at IS NOT NULL
		UNION ALL
		SELECT w.id, 'working_paper', w.title, w.code,
		       COALESCE(w.observation_cutoff,(w.completed_at AT TIME ZONE 'Asia/Jakarta')::date),
		       w.completed_at, w.sequence_no,
		       COALESCE(NULLIF(w.assessment_cycle,''), to_char(w.observation_cutoff,'YYYY-"Q"Q')),
		       w.monitoring_period_id
		FROM working_papers w
		WHERE ($2='' OR $2='working_paper') AND w.org_id=$1 AND w.status='completed'
		UNION ALL
		SELECT e.id, 'evaluation', 'Evaluasi', e.code,
		       COALESCE(e.report_date,(e.created_at AT TIME ZONE 'Asia/Jakarta')::date),
		       e.finalized_at, e.sequence_no, e.period, e.monitoring_period_id
		FROM evaluations e
		WHERE ($2='' OR $2='evaluation') AND e.organization_id=$1 AND e.status='final'
	), documents AS (
		SELECT s.*, CASE WHEN s.monitoring_period_id IS NULL THEN s.legacy_period
			ELSE format('%s-%s%s',r.year,CASE r.frequency WHEN 'monthly' THEN 'M' WHEN 'quarterly' THEN 'Q' ELSE 'H' END,p.ordinal)
		END AS period
		FROM sources s
		LEFT JOIN monitoring_rule_periods p ON p.id=s.monitoring_period_id
		LEFT JOIN monitoring_rules r ON r.id=p.rule_id
	)
	SELECT id,kind,title,code,document_date::text,finalized_at,period FROM documents
	WHERE ($4::uuid[] IS NULL OR id=ANY($4))
	  AND (kind='profile' OR period=ANY($8::text[]))
	  AND ($5='' OR concat_ws(' ',title,code,period,document_date::text) ILIKE '%' || $5 || '%')
	ORDER BY document_date DESC NULLS LAST, rank DESC, id DESC
	LIMIT NULLIF($6,0) OFFSET $7`

func reportDocumentOptions(ctx context.Context, db riskQueryer, org uuid.UUID, kind string, scope UPRSemesterInput, ids []uuid.UUID, query string, limit, offset int) ([]UPRReportDocumentOption, error) {
	semester, _, quarters, err := semesterPeriod(scope)
	if err != nil {
		return nil, err
	}
	periods := append(quarters, semester)
	for month := 6*(scope.Semester-1) + 1; month <= 6*scope.Semester; month++ {
		periods = append(periods, fmt.Sprintf("%d-M%d", scope.Year, month))
	}
	// Search treats SQL pattern characters as literal input.
	query = strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(strings.TrimSpace(query))
	rows, err := db.Query(ctx, reportDocumentOptionsSQL, org, kind, scope.Year, ids, query, limit, offset, periods)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportDocumentOption])
}

func (s *UPRWorkflow) SearchReportDocuments(ctx context.Context, org uuid.UUID, kind string, scope UPRSemesterInput, query string, page int) (UPRReportDocumentPage, error) {
	if kind != "profile" && kind != "working_paper" && kind != "evaluation" {
		return UPRReportDocumentPage{}, UPRWorkflowError("Jenis dokumen tidak valid.")
	}
	if page < 1 || page > 10000 || utf8.RuneCountInString(query) > 160 {
		return UPRReportDocumentPage{}, UPRWorkflowError("Pencarian dokumen tidak valid.")
	}
	const pageSize = 20
	items, err := reportDocumentOptions(ctx, s.pool, org, kind, scope, nil, query, pageSize+1, (page-1)*pageSize)
	if err != nil {
		return UPRReportDocumentPage{}, err
	}
	hasMore := len(items) > pageSize && page < 10000
	if len(items) > pageSize {
		items = items[:pageSize]
	}
	return UPRReportDocumentPage{Items: items, HasMore: hasMore}, nil
}

func (s *UPRWorkflow) SelectedReportDocuments(ctx context.Context, org uuid.UUID, scope UPRSemesterInput, ids []uuid.UUID) ([]UPRReportDocumentOption, error) {
	if len(ids) > 52 {
		return nil, UPRWorkflowError("Pilihan dokumen tidak valid.")
	}
	if len(ids) == 0 {
		return []UPRReportDocumentOption{}, nil
	}
	return reportDocumentOptions(ctx, s.pool, org, "", scope, ids, "", 0, 0)
}
