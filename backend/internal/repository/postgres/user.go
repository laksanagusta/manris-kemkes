package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// userRepository is the PostgreSQL implementation of repository.UserRepository
type userRepository struct {
	pool *pgxpool.Pool
}

// NewUserRepository creates a new user repository
func NewUserRepository(pool *pgxpool.Pool) repository.UserRepository {
	return &userRepository{pool: pool}
}

// Create inserts a new user
func (r *userRepository) Create(ctx context.Context, user *entity.User) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (name, username, email, password_hash, role, organization_id, status, must_change_password, nip, jabatan, pangkat, phone_number, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
		 RETURNING id, created_at, updated_at`,
		user.Name, user.Username, user.Email, user.PasswordHash, user.Role, user.OrganizationID, user.Status, user.MustChangePassword, user.NIP, user.Jabatan, user.Pangkat, user.PhoneNumber,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}

	return nil
}

// GetByID retrieves a user by ID
func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	user := &entity.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT u.id, u.name, u.username, u.email, u.password_hash, u.role, u.organization_id, COALESCE(o.name, '') as org_name, u.status, u.must_change_password, u.nip, u.jabatan, u.pangkat, u.phone_number, u.created_at, u.updated_at
		 FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
		 WHERE u.id = $1`, id,
	).Scan(&user.ID, &user.Name, &user.Username, &user.Email, &user.PasswordHash, &user.Role, &user.OrganizationID, &user.OrgName, &user.Status, &user.MustChangePassword, &user.NIP, &user.Jabatan, &user.Pangkat, &user.PhoneNumber, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("find user by id: %w", err)
	}

	return user, nil
}

// GetByUsername retrieves a user by username or email
func (r *userRepository) GetByUsername(ctx context.Context, username string) (*entity.User, error) {
	user := &entity.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT u.id, u.name, u.username, u.email, u.password_hash, u.role, u.organization_id, COALESCE(o.name, '') as org_name, u.status, u.must_change_password, u.nip, u.jabatan, u.pangkat, u.phone_number, u.created_at, u.updated_at
		 FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
		 WHERE u.username = $1 OR u.email = $1`, username,
	).Scan(&user.ID, &user.Name, &user.Username, &user.Email, &user.PasswordHash, &user.Role, &user.OrganizationID, &user.OrgName, &user.Status, &user.MustChangePassword, &user.NIP, &user.Jabatan, &user.Pangkat, &user.PhoneNumber, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("find user by username: %w", err)
	}

	return user, nil
}

// Update updates a user
func (r *userRepository) Update(ctx context.Context, user *entity.User) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET name=$2, username=$3, email=$4, password_hash=$5, role=$6, organization_id=$7, status=$8, must_change_password=$9, nip=$10, jabatan=$11, pangkat=$12, phone_number=$13, updated_at=NOW()
		 WHERE id=$1`,
		user.ID, user.Name, user.Username, user.Email, user.PasswordHash, user.Role, user.OrganizationID, user.Status, user.MustChangePassword, user.NIP, user.Jabatan, user.Pangkat, user.PhoneNumber,
	)

	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}

	return nil
}

// Delete deletes a user
func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return nil
}

// List retrieves all users
func (r *userRepository) List(ctx context.Context) ([]*entity.User, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT u.id, u.name, u.username, u.email, '', u.role, u.organization_id, COALESCE(o.name, '') as org_name, u.status, u.must_change_password, u.nip, u.jabatan, u.pangkat, u.phone_number, u.created_at, u.updated_at
		 FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
		 ORDER BY u.created_at`)

	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []*entity.User
	for rows.Next() {
		var user entity.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Username, &user.Email, &user.PasswordHash, &user.Role, &user.OrganizationID, &user.OrgName, &user.Status, &user.MustChangePassword, &user.NIP, &user.Jabatan, &user.Pangkat, &user.PhoneNumber, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, &user)
	}

	return users, nil
}

func (r *userRepository) ListWithFilter(ctx context.Context, filter repository.UserListFilter) ([]*entity.User, int, error) {
	countQuery := `SELECT COUNT(*) FROM users u WHERE 1=1`
	dataQuery := `SELECT u.id, u.name, u.username, u.email, '', u.role, u.organization_id, COALESCE(o.name, '') as org_name, u.status, u.must_change_password, u.nip, u.jabatan, u.pangkat, u.phone_number, u.created_at, u.updated_at
		 FROM users u LEFT JOIN organizations o ON u.organization_id = o.id WHERE 1=1`

	var args []interface{}
	argIdx := 1

	if filter.Q != "" {
		f := fmt.Sprintf(" AND (u.name ILIKE $%d OR u.username ILIKE $%d OR u.email ILIKE $%d)", argIdx, argIdx, argIdx)
		countQuery += f
		dataQuery += f
		args = append(args, "%"+filter.Q+"%")
		argIdx++
	}

	if filter.Status != "" {
		f := fmt.Sprintf(" AND u.status = $%d", argIdx)
		countQuery += f
		dataQuery += f
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.Role != "" {
		f := fmt.Sprintf(" AND u.role = $%d", argIdx)
		countQuery += f
		dataQuery += f
		args = append(args, filter.Role)
		argIdx++
	}

	if filter.OrganizationID != "" {
		f := fmt.Sprintf(" AND u.organization_id = $%d", argIdx)
		countQuery += f
		dataQuery += f
		args = append(args, filter.OrganizationID)
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("list users count: %w", err)
	}

	offset := (filter.Page - 1) * filter.Limit
	dataQuery += " ORDER BY u.created_at DESC, u.id DESC"
	dataQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list users query: %w", err)
	}
	defer rows.Close()

	var users []*entity.User
	for rows.Next() {
		var user entity.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Username, &user.Email, &user.PasswordHash, &user.Role, &user.OrganizationID, &user.OrgName, &user.Status, &user.MustChangePassword, &user.NIP, &user.Jabatan, &user.Pangkat, &user.PhoneNumber, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("list users scan: %w", err)
		}
		users = append(users, &user)
	}

	return users, total, nil
}

func (r *userRepository) GetByNIP(ctx context.Context, nip string) (*entity.User, error) {
	user := &entity.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT u.id, u.name, u.username, u.email, u.password_hash, u.role, u.organization_id, COALESCE(o.name, '') as org_name, u.status, u.must_change_password, u.nip, u.jabatan, u.pangkat, u.phone_number, u.created_at, u.updated_at
		 FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
		 WHERE u.nip = $1`, nip,
	).Scan(&user.ID, &user.Name, &user.Username, &user.Email, &user.PasswordHash, &user.Role, &user.OrganizationID, &user.OrgName, &user.Status, &user.MustChangePassword, &user.NIP, &user.Jabatan, &user.Pangkat, &user.PhoneNumber, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("find user by nip: %w", err)
	}

	return user, nil
}
