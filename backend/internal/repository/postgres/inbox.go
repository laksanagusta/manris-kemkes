package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/repository"
)

type inboxRepository struct {
	pool repositoryDB
}

func NewInboxRepository(pool *pgxpool.Pool) repository.InboxRepository {
	return &inboxRepository{pool: pool}
}

func (r *inboxRepository) List(ctx context.Context, f repository.InboxFilter) (repository.InboxPage, error) {
	order := collectionOrderBy(f.SortBy, f.SortOrder, "created_at", "id", map[string]string{
		"created_at": "created_at",
		"code":       "code",
		"title":      "title",
		"status":     "status",
		"type":       "kind",
	})

	// Keep the rows used for counts and pagination narrow. Load payload details
	// only for the selected page, within the same statement snapshot.
	query := `
		WITH items AS (
			SELECT ar.id, ar.created_at, ar.request_type::text AS kind,
				ar.current_status::text AS status, lower(r.code) AS code, lower(r.title) AS title,
				r.organization_id AS org_id,
				ar.current_status = 'pending' AND ar.current_approver_user_id IS NOT DISTINCT FROM $1::uuid AS actionable,
				CASE WHEN $8::text <> '' THEN
					ARRAY[r.code, r.title, org.name, u.name, ar.current_approver_role::text]
				END AS search_fields
			FROM approval_requests ar
			LEFT JOIN risks r ON r.id = ar.entity_id
			LEFT JOIN organizations org ON $8::text <> '' AND org.id = r.organization_id
			LEFT JOIN users u ON $8::text <> '' AND u.id = ar.requested_by
			WHERE ar.request_type IN ('risk', 'assessment')
				AND ($2::boolean OR r.organization_id = ANY($3::uuid[]))
				AND (NOT $4::boolean OR ar.current_approver_user_id = $1::uuid)
			UNION ALL
			SELECT sig.id, wp.created_at, 'working_paper', 'pending_signing',
				wp.id::text, lower(wp.title), wp.org_id, true,
				CASE WHEN $8::text <> '' THEN ARRAY[wp.title, wp.assessment_cycle, sig.signer_pangkat] END
			FROM working_papers wp
			JOIN working_paper_signatories sig ON sig.working_paper_id = wp.id
				AND sig.sequence_no = wp.current_signatory_sequence + 1
			WHERE wp.status = 'signing' AND sig.status = 'pending' AND sig.user_id = $1::uuid
				AND ($2::boolean OR wp.org_id = ANY($3::uuid[]))
		), filtered AS (
			SELECT id, created_at, kind, status, code, title FROM items
			WHERE ($5::uuid IS NULL OR org_id = $5)
				AND ($6::text = '' OR kind = $6)
				AND ($7::text = '' OR ($7 = 'my_approvals' AND actionable) OR status = $7)
				AND ($8::text = '' OR EXISTS (
					SELECT 1 FROM unnest(search_fields) field WHERE strpos(lower(field), lower($8)) > 0
				))
		), page AS (
			SELECT * FROM filtered ORDER BY ` + order + ` LIMIT $9 OFFSET $10
		), page_payloads AS (
			SELECT page.*, CASE WHEN page.kind = 'working_paper' THEN
				jsonb_build_object(
					'id', sig.id, 'requestType', 'working_paper', 'workingPaperId', wp.id,
					'organizationId', wp.org_id, 'title', wp.title, 'description', '',
					'assessmentCycle', wp.assessment_cycle, 'sequenceNo', sig.sequence_no,
					'signerPangkat', COALESCE(sig.signer_pangkat, ''), 'status', 'pending_signing',
					'createdAt', wp.created_at
				)
			ELSE
				jsonb_build_object(
					'id', ar.id, 'requestType', ar.request_type, 'entityId', ar.entity_id,
					'entityCode', r.code, 'entityTitle', r.title, 'entityOrgName', org.name,
					'entityOrgId', r.organization_id, 'requestedBy', ar.requested_by,
					'requestedByName', COALESCE(u.name, ''), 'requestedAt', ar.requested_at,
					'createdAt', ar.created_at, 'currentStatus', ar.current_status,
					'currentApproverRole', ar.current_approver_role, 'currentApproverUserId', ar.current_approver_user_id,
					'notes', ar.notes
				)
			END AS payload
			FROM page
			LEFT JOIN approval_requests ar ON page.kind <> 'working_paper' AND ar.id = page.id
			LEFT JOIN risks r ON r.id = ar.entity_id
			LEFT JOIN organizations org ON org.id = r.organization_id
			LEFT JOIN users u ON u.id = ar.requested_by
			LEFT JOIN working_paper_signatories sig ON page.kind = 'working_paper' AND sig.id = page.id
			LEFT JOIN working_papers wp ON wp.id = sig.working_paper_id
		)
		SELECT (SELECT COUNT(*) FROM filtered),
			COUNT(*), COUNT(*) FILTER (WHERE actionable),
			COUNT(*) FILTER (WHERE status = 'approved'), COUNT(*) FILTER (WHERE status = 'rejected'),
			(SELECT COALESCE(jsonb_agg(payload ORDER BY ` + order + `), '[]'::jsonb) FROM page_payloads)
		FROM items`

	result := repository.InboxPage{Page: f.Page, Limit: f.Limit}
	err := r.pool.QueryRow(ctx, query, f.UserID, f.Global, f.ReadableOrgIDs, f.AssignedOnly,
		f.OrganizationID, f.RequestType, f.Status, f.Query, f.Limit, int64(f.Page-1)*int64(f.Limit),
	).Scan(&result.Total, &result.Counts.All, &result.Counts.MyApprovals,
		&result.Counts.Approved, &result.Counts.Rejected, &result.Data)
	if err != nil {
		return repository.InboxPage{}, fmt.Errorf("list inbox: %w", err)
	}
	return result, nil
}
