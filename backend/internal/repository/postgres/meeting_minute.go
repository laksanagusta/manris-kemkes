package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type meetingMinuteRepository struct {
	pool repositoryDB
}

func NewMeetingMinuteRepository(pool *pgxpool.Pool) repository.MeetingMinuteRepository {
	return &meetingMinuteRepository{pool: pool}
}

func (r *meetingMinuteRepository) Create(ctx context.Context, input entity.CreateMeetingMinuteInput) (*entity.MeetingMinute, error) {
	if input.Scope == nil || input.Scope.UserID == uuid.Nil || input.CreatedBy != input.Scope.UserID ||
		(!input.Scope.IsGlobal && (input.OrganizationID == nil || !input.Scope.CanWrite(*input.OrganizationID))) {
		return nil, domainerrors.ErrForbidden
	}
	actionItemsJSON, err := json.Marshal(input.ActionItems)
	if err != nil {
		return nil, fmt.Errorf("marshal action items: %w", err)
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if err := authorizeMeetingMinuteRisks(ctx, tx, input.RiskIDs, input.Scope); err != nil {
		return nil, err
	}
	mm := &entity.MeetingMinute{}
	err = tx.QueryRow(ctx,
		`INSERT INTO meeting_minutes (title, date, participants, agenda, summary, key_points, decisions, open_issues, action_items, next_check_in, transcript, organization_id, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		 RETURNING id, created_at, updated_at`,
		input.Title, input.Date, input.Participants, input.Agenda, input.Summary, input.KeyPoints, input.Decisions, input.OpenIssues, actionItemsJSON, input.NextCheckIn, input.Transcript, input.OrganizationID, input.CreatedBy,
	).Scan(&mm.ID, &mm.CreatedAt, &mm.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create meeting minute: %w", err)
	}

	mm.Title = input.Title
	mm.Date = input.Date
	mm.Participants = input.Participants
	mm.Agenda = input.Agenda
	mm.Summary = input.Summary
	mm.KeyPoints = input.KeyPoints
	mm.Decisions = input.Decisions
	mm.OpenIssues = input.OpenIssues
	mm.ActionItems = input.ActionItems
	mm.NextCheckIn = input.NextCheckIn
	mm.Transcript = input.Transcript
	mm.OrganizationID = input.OrganizationID
	mm.CreatedBy = input.CreatedBy

	if err := insertMeetingMinuteLinks(ctx, tx, mm.ID, input.RiskIDs, input.CreatedBy); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	err = r.pool.QueryRow(ctx,
		`SELECT COALESCE(u.name, '') FROM users u WHERE u.id = $1`,
		input.CreatedBy,
	).Scan(&mm.CreatedByName)
	if err != nil {
		mm.CreatedByName = ""
	}

	return mm, nil
}

func (r *meetingMinuteRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.MeetingMinuteWithRisks, error) {
	mm := &entity.MeetingMinute{}
	var actionItemsJSON []byte

	query := `SELECT mm.id, mm.title, mm.date, mm.participants, mm.agenda, mm.summary, mm.key_points, mm.decisions, mm.open_issues, mm.action_items, mm.next_check_in, mm.transcript, mm.organization_id, mm.created_by, mm.created_at, mm.updated_at,
		        COALESCE(u.name, '') as created_by_name
		 FROM meeting_minutes mm
		 LEFT JOIN users u ON mm.created_by = u.id
		 WHERE mm.id = $1`
	args := []interface{}{id}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND mm.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(orgIDs))
	}

	err := r.pool.QueryRow(ctx, query, args...).Scan(&mm.ID, &mm.Title, &mm.Date, &mm.Participants, &mm.Agenda, &mm.Summary, &mm.KeyPoints, &mm.Decisions, &mm.OpenIssues, &actionItemsJSON, &mm.NextCheckIn, &mm.Transcript, &mm.OrganizationID, &mm.CreatedBy, &mm.CreatedAt, &mm.UpdatedAt, &mm.CreatedByName)
	if err != nil {
		return nil, fmt.Errorf("get meeting minute by id: %w", err)
	}

	if actionItemsJSON != nil {
		if err := json.Unmarshal(actionItemsJSON, &mm.ActionItems); err != nil {
			return nil, fmt.Errorf("unmarshal action items: %w", err)
		}
	}

	rows, err := r.pool.Query(ctx,
		`SELECT mmr.id, mmr.meeting_id, mmr.risk_id, mmr.linked_by, mmr.linked_at,
		        COALESCE(u.name, '') as linked_by_name,
		        COALESCE(r.code, '') as risk_code,
		        COALESCE(r.title, '') as risk_title
		 FROM meeting_minutes_risks mmr
		 LEFT JOIN users u ON mmr.linked_by = u.id
		 LEFT JOIN risks r ON mmr.risk_id = r.id
		 WHERE mmr.meeting_id = $1
		   AND ($2::boolean OR r.organization_id = ANY($3::uuid[]))
		 ORDER BY mmr.linked_at DESC`,
		id, len(orgIDs) == 0, orgIDs,
	)
	if err != nil {
		return nil, fmt.Errorf("get meeting minute risks: %w", err)
	}
	defer rows.Close()

	var linkedRisks []entity.MeetingMinutesRisk
	for rows.Next() {
		var mr entity.MeetingMinutesRisk
		if err := rows.Scan(&mr.ID, &mr.MeetingID, &mr.RiskID, &mr.LinkedBy, &mr.LinkedAt, &mr.LinkedByName, &mr.RiskCode, &mr.RiskTitle); err != nil {
			return nil, fmt.Errorf("scan meeting minute risk: %w", err)
		}
		linkedRisks = append(linkedRisks, mr)
	}

	return &entity.MeetingMinuteWithRisks{
		MeetingMinute: *mm,
		LinkedRisks:   linkedRisks,
	}, nil
}

func (r *meetingMinuteRepository) List(ctx context.Context, opts repository.ListMeetingMinutesOptions) ([]entity.MeetingMinute, int, error) {
	const from = " FROM meeting_minutes mm LEFT JOIN users u ON mm.created_by = u.id "
	whereClause := "WHERE 1=1"
	var args []interface{}
	argIdx := 1

	if opts.OrgIDs != nil {
		whereClause += fmt.Sprintf(" AND mm.organization_id = ANY($%d)", argIdx)
		args = append(args, opts.OrgIDs)
		argIdx++
	}
	if opts.CreatedBy != nil {
		whereClause += fmt.Sprintf(" AND mm.created_by = $%d", argIdx)
		args = append(args, *opts.CreatedBy)
		argIdx++
	}
	if opts.RiskID != nil {
		whereClause += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM meeting_minutes_risks mmr
			JOIN risks linked_risk ON linked_risk.id = mmr.risk_id
			WHERE mmr.meeting_id = mm.id AND mmr.risk_id = $%d
			  AND ($%d::boolean OR linked_risk.organization_id = ANY($%d::uuid[]))
		)`, argIdx, argIdx+1, argIdx+2)
		args = append(args, *opts.RiskID, opts.RiskOrgIDs == nil, opts.RiskOrgIDs)
		argIdx += 3
	}
	if opts.CreatedAt != "" {
		whereClause += fmt.Sprintf(" AND mm.created_at::date = $%d::date", argIdx)
		args = append(args, opts.CreatedAt)
		argIdx++
	}
	if opts.Date != "" {
		whereClause += fmt.Sprintf(" AND mm.date = $%d::date", argIdx)
		args = append(args, opts.Date)
		argIdx++
	}
	if opts.Query != "" {
		whereClause += fmt.Sprintf(` AND strpos(lower(concat_ws(' ', mm.title, mm.summary, u.name, array_to_string(mm.participants, ' '))), lower($%d)) > 0`, argIdx)
		args = append(args, opts.Query)
		argIdx++
	}

	var total int
	countQuery := "SELECT COUNT(*)" + from + whereClause
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count meeting minutes: %w", err)
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := opts.Offset
	if offset < 0 {
		offset = 0
	}

	sortColumns := map[string]string{
		"created_at":   "mm.created_at",
		"title":        "NULLIF(LOWER(mm.title), '')",
		"date":         "mm.date",
		"participants": "COALESCE(cardinality(mm.participants), 0)",
		"author":       "NULLIF(LOWER(u.name), '')",
	}
	tieBreaker := "mm.id"
	if opts.SortBy != "created_at" && sortColumns[opts.SortBy] != "" {
		tieBreaker = "mm.created_at DESC NULLS LAST, mm.id"
	}
	orderBy := collectionOrderBy(opts.SortBy, opts.SortOrder, "mm.created_at", tieBreaker, sortColumns)
	query := `SELECT mm.id, mm.title, mm.date, mm.participants, mm.agenda, mm.summary, mm.key_points, mm.decisions, mm.open_issues, mm.action_items, mm.next_check_in, mm.transcript, mm.organization_id, mm.created_by, mm.created_at, mm.updated_at,
	        COALESCE(u.name, '') as created_by_name` + from + whereClause +
		" ORDER BY " + orderBy + fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list meeting minutes: %w", err)
	}
	defer rows.Close()

	results := make([]entity.MeetingMinute, 0)
	for rows.Next() {
		var mm entity.MeetingMinute
		var actionItemsJSON []byte
		var nextCheckIn *time.Time

		if err := rows.Scan(&mm.ID, &mm.Title, &mm.Date, &mm.Participants, &mm.Agenda, &mm.Summary, &mm.KeyPoints, &mm.Decisions, &mm.OpenIssues, &actionItemsJSON, &nextCheckIn, &mm.Transcript, &mm.OrganizationID, &mm.CreatedBy, &mm.CreatedAt, &mm.UpdatedAt, &mm.CreatedByName); err != nil {
			return nil, 0, fmt.Errorf("scan meeting minute: %w", err)
		}

		if actionItemsJSON != nil {
			if err := json.Unmarshal(actionItemsJSON, &mm.ActionItems); err != nil {
				return nil, 0, fmt.Errorf("unmarshal action items: %w", err)
			}
		}

		mm.NextCheckIn = nextCheckIn

		results = append(results, mm)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate meeting minutes: %w", err)
	}

	return results, total, nil
}

func (r *meetingMinuteRepository) ListAuthors(ctx context.Context, orgIDs []uuid.UUID) ([]repository.MeetingMinuteAuthor, error) {
	query := `SELECT DISTINCT mm.created_by, COALESCE(NULLIF(u.name, ''), mm.created_by::text)
		FROM meeting_minutes mm
		LEFT JOIN users u ON mm.created_by = u.id
		WHERE mm.created_by IS NOT NULL`
	var args []any
	if orgIDs != nil {
		query += " AND mm.organization_id = ANY($1)"
		args = append(args, orgIDs)
	}
	rows, err := r.pool.Query(ctx, query+" ORDER BY 2, 1", args...)
	if err != nil {
		return nil, fmt.Errorf("list meeting minute authors: %w", err)
	}
	defer rows.Close()

	authors := make([]repository.MeetingMinuteAuthor, 0)
	for rows.Next() {
		var author repository.MeetingMinuteAuthor
		if err := rows.Scan(&author.ID, &author.Name); err != nil {
			return nil, fmt.Errorf("scan meeting minute author: %w", err)
		}
		authors = append(authors, author)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate meeting minute authors: %w", err)
	}
	return authors, nil
}

func (r *meetingMinuteRepository) Delete(ctx context.Context, id uuid.UUID) error {
	commandTag, err := r.pool.Exec(ctx, `DELETE FROM meeting_minutes WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete meeting minute: %w", err)
	}
	if commandTag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *meetingMinuteRepository) ListByRiskID(ctx context.Context, riskID uuid.UUID, orgIDs []uuid.UUID) ([]entity.MeetingMinutesRisk, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT mmr.id, mmr.meeting_id, mmr.risk_id, mmr.linked_by, mmr.linked_at,
		        COALESCE(u.name, '') as linked_by_name,
		        COALESCE(r.code, '') as risk_code,
		        COALESCE(r.title, '') as risk_title
		 FROM meeting_minutes_risks mmr
		 LEFT JOIN users u ON mmr.linked_by = u.id
		 LEFT JOIN risks r ON mmr.risk_id = r.id
		 JOIN meeting_minutes mm ON mm.id = mmr.meeting_id
		 WHERE mmr.risk_id = $1
		   AND ($2::boolean OR (
		     mm.organization_id = ANY($3::uuid[]) AND r.organization_id = ANY($3::uuid[])
		   ))
		 ORDER BY mmr.linked_at DESC`,
		riskID, len(orgIDs) == 0, orgIDs,
	)
	if err != nil {
		return nil, fmt.Errorf("list meeting minutes by risk id: %w", err)
	}
	defer rows.Close()

	var results []entity.MeetingMinutesRisk
	for rows.Next() {
		var mr entity.MeetingMinutesRisk
		if err := rows.Scan(&mr.ID, &mr.MeetingID, &mr.RiskID, &mr.LinkedBy, &mr.LinkedAt, &mr.LinkedByName, &mr.RiskCode, &mr.RiskTitle); err != nil {
			return nil, fmt.Errorf("scan meeting minutes risk: %w", err)
		}
		results = append(results, mr)
	}

	return results, nil
}

func authorizeMeetingMinuteRisks(ctx context.Context, tx pgx.Tx, riskIDs []uuid.UUID, scope *entity.AccessScope) error {
	if len(riskIDs) == 0 {
		return nil
	}
	rows, err := tx.Query(ctx, `
		SELECT id FROM risks
		WHERE id = ANY($1::uuid[])
		  AND ($2::boolean OR organization_id = ANY($3::uuid[]))
		ORDER BY id FOR SHARE`, riskIDs, scope.IsGlobal, scope.AccessibleOrgIDs)
	if err != nil {
		return err
	}

	found, err := pgx.CollectRows(rows, pgx.RowTo[uuid.UUID])
	if err != nil {
		return err
	}
	unique := make(map[uuid.UUID]struct{}, len(riskIDs))
	for _, id := range riskIDs {
		unique[id] = struct{}{}
	}
	if len(found) != len(unique) {
		return domainerrors.ErrForbidden
	}
	return nil
}

func (r *meetingMinuteRepository) mutateLinks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID, scope *entity.AccessScope, mutate func(pgx.Tx) error) error {
	if scope == nil || scope.UserID == uuid.Nil {
		return domainerrors.ErrForbidden
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var id uuid.UUID
	err = tx.QueryRow(ctx, `
		SELECT id FROM meeting_minutes
		WHERE id = $1 AND ($2::boolean OR organization_id = $3::uuid)
		FOR UPDATE`, meetingID, scope.IsGlobal, scope.OrganizationID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return domainerrors.ErrNotFound
	}
	if err != nil {
		return err
	}
	if err := authorizeMeetingMinuteRisks(ctx, tx, riskIDs, scope); err != nil {
		return err
	}
	if err := mutate(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func insertMeetingMinuteLinks(ctx context.Context, tx pgx.Tx, meetingID uuid.UUID, riskIDs []uuid.UUID, actorID uuid.UUID) error {
	if len(riskIDs) == 0 {
		return nil
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO meeting_minutes_risks (meeting_id, risk_id, linked_by)
		SELECT $1, risk_id, $3 FROM unnest($2::uuid[]) AS selected(risk_id)
		ON CONFLICT (meeting_id, risk_id) DO NOTHING`, meetingID, riskIDs, actorID)
	return err
}

func (r *meetingMinuteRepository) LinkRisks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID, scope *entity.AccessScope) error {
	return r.mutateLinks(ctx, meetingID, riskIDs, scope, func(tx pgx.Tx) error {
		return insertMeetingMinuteLinks(ctx, tx, meetingID, riskIDs, scope.UserID)
	})
}

func (r *meetingMinuteRepository) UnlinkRisks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID, scope *entity.AccessScope) error {
	return r.mutateLinks(ctx, meetingID, riskIDs, scope, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `
			DELETE FROM meeting_minutes_risks WHERE meeting_id = $1 AND risk_id = ANY($2::uuid[])`, meetingID, riskIDs)
		return err
	})
}
