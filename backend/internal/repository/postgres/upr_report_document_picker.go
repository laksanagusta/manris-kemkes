package postgres

import (
	"context"
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
}

type UPRReportDocumentPage struct {
	Items   []UPRReportDocumentOption `json:"items"`
	HasMore bool                      `json:"hasMore"`
}

const reportDocumentOptionsSQL = `
	WITH documents AS (
		SELECT p.id, 'profile' AS kind, format('Profil %s v%s',p.year,p.version) AS title,
		       format('Versi %s',p.version) AS code, (p.finalized_at AT TIME ZONE 'Asia/Jakarta')::date AS document_date,
		       p.finalized_at, p.version AS rank
		FROM annual_risk_profile_versions p
		WHERE ($2='' OR $2='profile') AND p.organization_id=$1 AND p.year=$3 AND p.finalized_at IS NOT NULL
		UNION ALL
		SELECT w.id, 'working_paper', w.title, w.code,
		       COALESCE(w.observation_cutoff,(w.completed_at AT TIME ZONE 'Asia/Jakarta')::date),
		       w.completed_at, w.sequence_no
		FROM working_papers w
		WHERE ($2='' OR $2='working_paper') AND w.org_id=$1 AND w.status='completed'
		UNION ALL
		SELECT e.id, 'evaluation', 'Evaluasi', e.code,
		       COALESCE(e.report_date,(e.created_at AT TIME ZONE 'Asia/Jakarta')::date),
		       e.finalized_at, e.sequence_no
		FROM evaluations e
		WHERE ($2='' OR $2='evaluation') AND e.organization_id=$1 AND e.status='final'
	)
	SELECT id,kind,title,code,document_date::text,finalized_at FROM documents
	WHERE ($4::uuid[] IS NULL OR id=ANY($4))
	  AND ($5='' OR concat_ws(' ',title,code,document_date::text) ILIKE '%' || $5 || '%')
	ORDER BY document_date DESC NULLS LAST, rank DESC, id DESC
	LIMIT $6 OFFSET $7`

func (s *UPRWorkflow) reportDocumentOptions(ctx context.Context, org uuid.UUID, kind string, year int, ids []uuid.UUID, query string, limit, offset int) ([]UPRReportDocumentOption, error) {
	// Search treats SQL pattern characters as literal input.
	query = strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(strings.TrimSpace(query))
	rows, err := s.pool.Query(ctx, reportDocumentOptionsSQL, org, kind, year, ids, query, limit, offset)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportDocumentOption])
}

func (s *UPRWorkflow) SearchReportDocuments(ctx context.Context, org uuid.UUID, kind string, year int, query string, page int) (UPRReportDocumentPage, error) {
	if kind != "profile" && kind != "working_paper" && kind != "evaluation" {
		return UPRReportDocumentPage{}, UPRWorkflowError("Jenis dokumen tidak valid.")
	}
	if year < 1900 || year > 9998 || page < 1 || page > 10000 || utf8.RuneCountInString(query) > 160 {
		return UPRReportDocumentPage{}, UPRWorkflowError("Pencarian dokumen tidak valid.")
	}
	const pageSize = 20
	items, err := s.reportDocumentOptions(ctx, org, kind, year, nil, query, pageSize+1, (page-1)*pageSize)
	if err != nil {
		return UPRReportDocumentPage{}, err
	}
	hasMore := len(items) > pageSize && page < 10000
	if len(items) > pageSize {
		items = items[:pageSize]
	}
	return UPRReportDocumentPage{Items: items, HasMore: hasMore}, nil
}

func (s *UPRWorkflow) SelectedReportDocuments(ctx context.Context, org uuid.UUID, year int, ids []uuid.UUID) ([]UPRReportDocumentOption, error) {
	if len(ids) > 52 || year < 1900 || year > 9998 {
		return nil, UPRWorkflowError("Pilihan dokumen tidak valid.")
	}
	if len(ids) == 0 {
		return []UPRReportDocumentOption{}, nil
	}
	return s.reportDocumentOptions(ctx, org, "", year, ids, "", len(ids), 0)
}
