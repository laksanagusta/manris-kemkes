package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type organizationGroupRepository struct {
	pool *pgxpool.Pool
}

func NewOrganizationGroupRepository(pool *pgxpool.Pool) repository.OrganizationGroupRepository {
	return &organizationGroupRepository{pool: pool}
}

func normalizeOrganizationGroupMemberIDs(memberIDs []uuid.UUID) []uuid.UUID {
	if len(memberIDs) == 0 {
		return []uuid.UUID{}
	}

	seen := make(map[uuid.UUID]struct{}, len(memberIDs))
	result := make([]uuid.UUID, 0, len(memberIDs))
	for _, id := range memberIDs {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
	}

	return result
}

func mapOrganizationGroupError(err error) error {
	if err == nil {
		return nil
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch {
		case pgErr.Code == "23505" && pgErr.ConstraintName == "idx_organization_groups_owner_name_unique":
			return domainerrors.ErrOrgGroupNameAlreadyExists
		case pgErr.Code == "23503":
			return domainerrors.ErrReferencedOrgOrGroupNotFound
		}
	}

	if errors.Is(err, pgx.ErrNoRows) {
		return domainerrors.ErrNotFound
	}

	return err
}

func (r *organizationGroupRepository) Create(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	memberIDs = normalizeOrganizationGroupMemberIDs(memberIDs)

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin create organization group tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var createdBy any = nil
	if group.CreatedBy != nil {
		createdBy = *group.CreatedBy
	}

	if err := tx.QueryRow(ctx, `
		INSERT INTO organization_groups (owner_organization_id, name, description, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`, group.OwnerOrganizationID, group.Name, group.Description, createdBy).Scan(&group.ID, &group.CreatedAt, &group.UpdatedAt); err != nil {
		return mapOrganizationGroupError(err)
	}

	if err := upsertOrganizationGroupMembers(ctx, tx, group.ID, memberIDs); err != nil {
		return err
	}
	group.MemberCount = len(memberIDs)

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit create organization group tx: %w", err)
	}

	return nil
}

func (r *organizationGroupRepository) Update(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	memberIDs = normalizeOrganizationGroupMemberIDs(memberIDs)

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin update organization group tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var createdBy any = nil
	if group.CreatedBy != nil {
		createdBy = *group.CreatedBy
	}

	tag, err := tx.Exec(ctx, `
		UPDATE organization_groups
		SET owner_organization_id = $2,
		    name = $3,
		    description = $4,
		    created_by = COALESCE($5, created_by),
		    updated_at = NOW()
		WHERE id = $1
	`, group.ID, group.OwnerOrganizationID, group.Name, group.Description, createdBy)
	if err != nil {
		return mapOrganizationGroupError(err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}

	if _, err := tx.Exec(ctx, `DELETE FROM organization_group_members WHERE group_id = $1`, group.ID); err != nil {
		return fmt.Errorf("delete organization group members: %w", err)
	}
	if err := upsertOrganizationGroupMembers(ctx, tx, group.ID, memberIDs); err != nil {
		return err
	}
	group.MemberCount = len(memberIDs)

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit update organization group tx: %w", err)
	}

	return nil
}

func upsertOrganizationGroupMembers(ctx context.Context, tx pgx.Tx, groupID uuid.UUID, memberIDs []uuid.UUID) error {
	for _, memberID := range memberIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO organization_group_members (group_id, organization_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, groupID, memberID); err != nil {
			return fmt.Errorf("insert organization group member: %w", err)
		}
	}
	return nil
}

func (r *organizationGroupRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM organization_groups WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete organization group: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *organizationGroupRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.OrganizationGroup, error) {
	query := `
		SELECT g.id, g.owner_organization_id, COALESCE(owner.name, ''), g.name, g.description,
		       g.created_by, g.created_at, g.updated_at,
		       COUNT(m.organization_id)::bigint
		FROM organization_groups g
		LEFT JOIN organizations owner ON owner.id = g.owner_organization_id
		LEFT JOIN organization_group_members m ON m.group_id = g.id
		WHERE g.id = $1
		GROUP BY g.id, owner.name
	`

	group := &entity.OrganizationGroup{}
	var createdBy uuid.NullUUID
	var memberCount int64
	if err := r.pool.QueryRow(ctx, query, id).Scan(
		&group.ID,
		&group.OwnerOrganizationID,
		&group.OwnerOrganizationName,
		&group.Name,
		&group.Description,
		&createdBy,
		&group.CreatedAt,
		&group.UpdatedAt,
		&memberCount,
	); err != nil {
		return nil, mapOrganizationGroupError(err)
	}

	if createdBy.Valid {
		group.CreatedBy = &createdBy.UUID
	}
	group.MemberCount = int(memberCount)

	members, err := r.listMembers(ctx, group.ID)
	if err != nil {
		return nil, err
	}
	group.Members = members

	return group, nil
}

func (r *organizationGroupRepository) List(ctx context.Context, filter repository.OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error) {
	countQuery, dataQuery, args := organizationGroupQueries(filter)

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count organization groups: %w", err)
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	dataQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list organization groups: %w", err)
	}
	defer rows.Close()

	groups := make([]*entity.OrganizationGroup, 0)
	for rows.Next() {
		group := &entity.OrganizationGroup{}
		var createdBy uuid.NullUUID
		var memberCount int64
		if err := rows.Scan(
			&group.ID,
			&group.OwnerOrganizationID,
			&group.OwnerOrganizationName,
			&group.Name,
			&group.Description,
			&createdBy,
			&group.CreatedAt,
			&group.UpdatedAt,
			&memberCount,
		); err != nil {
			return nil, 0, fmt.Errorf("scan organization group: %w", err)
		}
		if createdBy.Valid {
			group.CreatedBy = &createdBy.UUID
		}
		group.MemberCount = int(memberCount)
		if filter.IncludeMembers {
			members, err := r.listMembers(ctx, group.ID)
			if err != nil {
				return nil, 0, err
			}
			group.Members = members
		}
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate organization groups: %w", err)
	}

	return groups, total, nil
}

func organizationGroupQueries(filter repository.OrganizationGroupListFilter) (string, string, []any) {
	baseCount := `
		SELECT COUNT(DISTINCT g.id)
		FROM organization_groups g
		LEFT JOIN organizations owner ON owner.id = g.owner_organization_id
		WHERE 1=1
	`
	baseData := `
		SELECT g.id, g.owner_organization_id, COALESCE(owner.name, ''), g.name, g.description,
		       g.created_by, g.created_at, g.updated_at,
		       COUNT(m.organization_id)::bigint
		FROM organization_groups g
		LEFT JOIN organizations owner ON owner.id = g.owner_organization_id
		LEFT JOIN organization_group_members m ON m.group_id = g.id
		WHERE 1=1
	`

	var (
		clauses []string
		args    []any
		argPos  = 1
	)

	if filter.OwnerOrganizationID != nil {
		clauses = append(clauses, fmt.Sprintf(" AND g.owner_organization_id = $%d", argPos))
		args = append(args, *filter.OwnerOrganizationID)
		argPos++
	}
	if trimmed := strings.TrimSpace(filter.Q); trimmed != "" {
		clauses = append(clauses, fmt.Sprintf(" AND g.name ILIKE $%d", argPos))
		args = append(args, "%"+trimmed+"%")
		argPos++
	}

	countQuery := baseCount + strings.Join(clauses, "")
	dataQuery := baseData + strings.Join(clauses, "") + `
		GROUP BY g.id, owner.name
		ORDER BY g.name ASC
	`
	return countQuery, dataQuery, args
}

func (r *organizationGroupRepository) listMembers(ctx context.Context, groupID uuid.UUID) ([]entity.OrganizationGroupMember, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT o.id, o.name, o.parent_id, COALESCE(o.location, '')
		FROM organization_group_members m
		JOIN organizations o ON o.id = m.organization_id
		WHERE m.group_id = $1
		ORDER BY o.name ASC
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("list organization group members: %w", err)
	}
	defer rows.Close()

	members := make([]entity.OrganizationGroupMember, 0)
	for rows.Next() {
		var member entity.OrganizationGroupMember
		var parentID uuid.NullUUID
		if err := rows.Scan(&member.ID, &member.Name, &parentID, &member.Location); err != nil {
			return nil, fmt.Errorf("scan organization group member: %w", err)
		}
		if parentID.Valid {
			member.ParentID = &parentID.UUID
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate organization group members: %w", err)
	}

	return members, nil
}

func (r *organizationGroupRepository) ListMemberIDs(ctx context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT organization_id
		FROM organization_group_members
		WHERE group_id = $1
		ORDER BY organization_id
	`, id)
	if err != nil {
		return nil, fmt.Errorf("list organization group member ids: %w", err)
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0)
	for rows.Next() {
		var memberID uuid.UUID
		if err := rows.Scan(&memberID); err != nil {
			return nil, fmt.Errorf("scan organization group member id: %w", err)
		}
		ids = append(ids, memberID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate organization group member ids: %w", err)
	}

	return ids, nil
}

var _ interface {
	Create(context.Context, *entity.OrganizationGroup, []uuid.UUID) error
	Update(context.Context, *entity.OrganizationGroup, []uuid.UUID) error
	Delete(context.Context, uuid.UUID) error
	GetByID(context.Context, uuid.UUID) (*entity.OrganizationGroup, error)
	List(context.Context, repository.OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error)
	ListMemberIDs(context.Context, uuid.UUID) ([]uuid.UUID, error)
} = (*organizationGroupRepository)(nil)
