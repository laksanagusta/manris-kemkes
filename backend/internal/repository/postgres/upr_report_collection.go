package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type UPRReportCollectionFilter struct {
	Query          string
	OrganizationID *uuid.UUID
	Period         string
	Status         string
	SortBy         string
	SortOrder      string
	Page           int
	Limit          int
}

type UPRReportCollectionRow struct {
	ID      uuid.UUID  `json:"id"`
	Draft   bool       `json:"draft"`
	Title   string     `json:"title"`
	Period  string     `json:"period"`
	Status  string     `json:"status"`
	Unit    string     `json:"unit"`
	Version *int       `json:"version"`
	Time    *time.Time `json:"time"`
}

type UPRReportCollectionPage struct {
	Items       []UPRReportCollectionRow `json:"items"`
	Total       int                      `json:"total"`
	Page        int                      `json:"page"`
	Limit       int                      `json:"limit"`
	Periods     []string                 `json:"periods"`
	HasChildren bool                     `json:"hasChildren"`
}

// The collection combines drafts and delivered/final reports before filtering
// and paging. Legacy workspace consumers retain their separate source lists.
const uprReportCollectionSQL = `WITH own AS (
	SELECT o.id,
		EXISTS (SELECT 1 FROM organizations child WHERE child.parent_id=o.id) AS has_children,
		CASE WHEN o.upr_level='upr_t2' AND parent.upr_level='upr_t1' THEN parent.name END AS recipient
	FROM organizations o LEFT JOIN organizations parent ON parent.id=o.parent_id
	WHERE o.id=$1
), records AS (
	SELECT draft.id, TRUE AS draft, COALESCE(draft.payload->>'title', '') AS title,
		concat(draft.payload->>'year','-H',draft.payload->>'semester') AS period,
		'draft'::text AS status, COALESCE('Ke ' || own.recipient, '—') AS unit,
		NULL::uuid AS sender_id, NULL::int AS version, NULL::timestamptz AS time,
		draft.updated_at AS sort_time, 0 AS lane
	FROM upr_report_drafts draft CROSS JOIN own
	WHERE draft.organization_id=own.id AND draft.sent_version_id IS NULL
	UNION ALL
	SELECT v.id, FALSE,
		COALESCE(NULLIF(CASE WHEN v.kind='semester' THEN v.snapshot->>'title' END, ''),
			CASE v.kind WHEN 'semester' THEN 'Laporan Penerapan Manajemen Risiko'
				WHEN 'working_paper' THEN 'KK Pemantauan dan Reviu' ELSE 'Evaluasi' END),
		v.period, COALESCE(delivery.resolution, CASE WHEN delivery.sent_at IS NOT NULL THEN 'sent' ELSE 'final' END),
		CASE WHEN delivery.recipient_organization_id=own.id THEN 'Dari ' || sender.name
			ELSE COALESCE('Ke ' || recipient.name, '—') END,
		CASE WHEN delivery.recipient_organization_id=own.id THEN v.organization_id END,
		v.version, COALESCE(delivery.sent_at, v.finalized_at),
		COALESCE(delivery.sent_at, v.finalized_at), 1
	FROM upr_report_versions v
	JOIN organizations sender ON sender.id=v.organization_id
	LEFT JOIN upr_report_deliveries delivery ON delivery.report_version_id=v.id
	LEFT JOIN organizations recipient ON recipient.id=delivery.recipient_organization_id
	CROSS JOIN own
	WHERE v.organization_id=own.id
		OR (own.has_children AND delivery.recipient_organization_id=own.id)
)`

const uprReportCollectionPredicates = ` WHERE ($2='' OR strpos(lower(concat_ws(' ',title,unit)),lower($2))>0)
	AND ($3::uuid IS NULL OR sender_id=$3)
	AND ($4='' OR period=$4) AND ($5='' OR status=$5)`

func uprReportCollectionOrder(filter UPRReportCollectionFilter) string {
	columns := map[string]string{
		"title": "LOWER(title)", "period": "period", "unit": "LOWER(unit)", "status": "status",
	}
	if columns[filter.SortBy] == "" {
		return "lane ASC, sort_time DESC NULLS LAST, id DESC"
	}
	return collectionOrderBy(filter.SortBy, filter.SortOrder, "sort_time", "sort_time DESC NULLS LAST, id", columns)
}

func (s *UPRWorkflow) ReportCollection(ctx context.Context, org uuid.UUID, filter UPRReportCollectionFilter) (UPRReportCollectionPage, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 20
	}
	result := UPRReportCollectionPage{Page: filter.Page, Limit: filter.Limit}
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)

	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM organizations WHERE parent_id=$1)`, org).Scan(&result.HasChildren); err != nil {
		return result, err
	}
	periods, err := tx.Query(ctx, uprReportCollectionSQL+` SELECT DISTINCT period FROM records ORDER BY period DESC`, org)
	if err != nil {
		return result, fmt.Errorf("list report periods: %w", err)
	}
	result.Periods, err = pgx.CollectRows(periods, pgx.RowTo[string])
	if err != nil {
		return result, err
	}
	args := []any{org, strings.TrimSpace(filter.Query), filter.OrganizationID, filter.Period, filter.Status}
	if err = tx.QueryRow(ctx, uprReportCollectionSQL+" SELECT COUNT(*) FROM records"+uprReportCollectionPredicates, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count report collection: %w", err)
	}
	query := uprReportCollectionSQL + ` SELECT id,draft,title,period,status,unit,version,time FROM records` +
		uprReportCollectionPredicates + " ORDER BY " + uprReportCollectionOrder(filter) + " LIMIT $6 OFFSET $7"
	args = append(args, filter.Limit, (filter.Page-1)*filter.Limit)
	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return result, fmt.Errorf("list report collection: %w", err)
	}
	result.Items, err = pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportCollectionRow])
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}
