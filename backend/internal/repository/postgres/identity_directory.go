package postgres

import (
	"context"
	"fmt"

	"github.com/manris/backend/internal/identity/domain"
)

func (r *identityDirectory) ListDirectory(ctx context.Context, f domain.DirectoryFilter) ([]*domain.DirectoryUser, int, error) {
	// Use binary UUID arrays supported by pgx without external type registration.
	scope := make([][16]byte, len(f.AllowedOrgIDs))
	for i, id := range f.AllowedOrgIDs {
		scope[i] = [16]byte(id)
	}
	where := ` WHERE ($1::boolean OR u.organization_id = ANY($2::uuid[]))
 AND ($3::text = '' OR u.name ILIKE '%' || $3 || '%' OR u.username ILIKE '%' || $3 || '%' OR u.email ILIKE '%' || $3 || '%' OR u.nip ILIKE '%' || $3 || '%')
 AND ($4::text = '' OR u.role = $4)
 AND ($5::text = '' OR u.status = $5)
 AND ($6::uuid IS NULL OR u.organization_id = $6)`
	args := []any{f.Global, scope, f.Q, f.Role, f.Status, f.OrganizationID}
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users u`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count shared directory users: %w", err)
	}
	query := `SELECT u.id, u.name, u.username, u.email, u.role, u.organization_id, COALESCE(o.name,''), u.status,
 COALESCE(u.nip,''), COALESCE(u.jabatan,''), COALESCE(u.pangkat,''), COALESCE(u.phone_number,''), u.created_at, u.updated_at
 FROM users u LEFT JOIN organizations o ON o.id=u.organization_id` + where + ` ORDER BY u.created_at DESC,u.id DESC LIMIT $7 OFFSET $8`
	args = append(args, f.Limit, (f.Page-1)*f.Limit)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list shared directory users: %w", err)
	}
	defer rows.Close()
	users := make([]*domain.DirectoryUser, 0)
	for rows.Next() {
		u := &domain.DirectoryUser{}
		if err := rows.Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.Role, &u.OrganizationID, &u.OrgName, &u.Status, &u.NIP, &u.Jabatan, &u.Pangkat, &u.PhoneNumber, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan shared directory user: %w", err)
		}
		u.Role = domain.NormalizeRole(u.Role)
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("read shared directory users: %w", err)
	}
	return users, total, nil
}
