package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type meetingMinuteRepository struct {
	pool *pgxpool.Pool
}

func NewMeetingMinuteRepository(pool *pgxpool.Pool) repository.MeetingMinuteRepository {
	return &meetingMinuteRepository{pool: pool}
}

func (r *meetingMinuteRepository) Create(ctx context.Context, input entity.CreateMeetingMinuteInput) (*entity.MeetingMinute, error) {
	actionItemsJSON, err := json.Marshal(input.ActionItems)
	if err != nil {
		return nil, fmt.Errorf("marshal action items: %w", err)
	}

	mm := &entity.MeetingMinute{}
	err = r.pool.QueryRow(ctx,
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

	if len(input.RiskIDs) > 0 {
		for _, riskID := range input.RiskIDs {
			_, err := r.pool.Exec(ctx,
				`INSERT INTO meeting_minutes_risks (meeting_id, risk_id, linked_by) VALUES ($1, $2, $3)`,
				mm.ID, riskID, input.CreatedBy,
			)
			if err != nil {
				return nil, fmt.Errorf("link risk %s: %w", riskID, err)
			}
		}
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

func (r *meetingMinuteRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.MeetingMinuteWithRisks, error) {
	mm := &entity.MeetingMinute{}
	var actionItemsJSON []byte

	err := r.pool.QueryRow(ctx,
		`SELECT mm.id, mm.title, mm.date, mm.participants, mm.agenda, mm.summary, mm.key_points, mm.decisions, mm.open_issues, mm.action_items, mm.next_check_in, mm.transcript, mm.organization_id, mm.created_by, mm.created_at, mm.updated_at,
		        COALESCE(u.name, '') as created_by_name
		 FROM meeting_minutes mm
		 LEFT JOIN users u ON mm.created_by = u.id
		 WHERE mm.id = $1`,
		id,
	).Scan(&mm.ID, &mm.Title, &mm.Date, &mm.Participants, &mm.Agenda, &mm.Summary, &mm.KeyPoints, &mm.Decisions, &mm.OpenIssues, &actionItemsJSON, &mm.NextCheckIn, &mm.Transcript, &mm.OrganizationID, &mm.CreatedBy, &mm.CreatedAt, &mm.UpdatedAt, &mm.CreatedByName)
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
		 ORDER BY mmr.linked_at DESC`,
		id,
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
	whereClause := "WHERE 1=1"
	var args []interface{}
	argIdx := 1

	if opts.OrganizationID != nil {
		whereClause += fmt.Sprintf(" AND mm.organization_id = $%d", argIdx)
		args = append(args, *opts.OrganizationID)
		argIdx++
	}
	if opts.CreatedBy != nil {
		whereClause += fmt.Sprintf(" AND mm.created_by = $%d", argIdx)
		args = append(args, *opts.CreatedBy)
		argIdx++
	}
	if opts.RiskID != nil {
		whereClause += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM meeting_minutes_risks mmr WHERE mmr.meeting_id = mm.id AND mmr.risk_id = $%d)", argIdx)
		args = append(args, *opts.RiskID)
		argIdx++
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM meeting_minutes mm " + whereClause
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

	query := fmt.Sprintf(`SELECT mm.id, mm.title, mm.date, mm.participants, mm.agenda, mm.summary, mm.key_points, mm.decisions, mm.open_issues, mm.action_items, mm.next_check_in, mm.transcript, mm.organization_id, mm.created_by, mm.created_at, mm.updated_at,
	        COALESCE(u.name, '') as created_by_name
	 FROM meeting_minutes mm
	 LEFT JOIN users u ON mm.created_by = u.id
	 %s
	 ORDER BY mm.date DESC, mm.created_at DESC
	 LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list meeting minutes: %w", err)
	}
	defer rows.Close()

	var results []entity.MeetingMinute
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

	return results, total, nil
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

func (r *meetingMinuteRepository) ListByRiskID(ctx context.Context, riskID uuid.UUID) ([]entity.MeetingMinutesRisk, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT mmr.id, mmr.meeting_id, mmr.risk_id, mmr.linked_by, mmr.linked_at,
		        COALESCE(u.name, '') as linked_by_name,
		        COALESCE(r.code, '') as risk_code,
		        COALESCE(r.title, '') as risk_title
		 FROM meeting_minutes_risks mmr
		 LEFT JOIN users u ON mmr.linked_by = u.id
		 LEFT JOIN risks r ON mmr.risk_id = r.id
		 WHERE mmr.risk_id = $1
		 ORDER BY mmr.linked_at DESC`,
		riskID,
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

func (r *meetingMinuteRepository) LinkRisks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID, linkedBy uuid.UUID) error {
	for _, riskID := range riskIDs {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO meeting_minutes_risks (meeting_id, risk_id, linked_by) 
			 VALUES ($1, $2, $3)
			 ON CONFLICT (meeting_id, risk_id) DO NOTHING`,
			meetingID, riskID, linkedBy,
		)
		if err != nil {
			return fmt.Errorf("link risk %s to meeting %s: %w", riskID, meetingID, err)
		}
	}
	return nil
}

func (r *meetingMinuteRepository) UnlinkRisks(ctx context.Context, meetingID uuid.UUID, riskIDs []uuid.UUID) error {
	for _, riskID := range riskIDs {
		_, err := r.pool.Exec(ctx,
			`DELETE FROM meeting_minutes_risks WHERE meeting_id = $1 AND risk_id = $2`,
			meetingID, riskID,
		)
		if err != nil {
			return fmt.Errorf("unlink risk %s from meeting %s: %w", riskID, meetingID, err)
		}
	}
	return nil
}
