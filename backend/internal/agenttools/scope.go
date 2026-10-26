package agenttools

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/repository/postgres"
)

// Shared identity uses the same users/organizations directory. There is no
// separate membership table; active Manris application + full active user is
// the identity service's membership rule. Background work stores no token.
func (t *Toolkit) resolveScope(ctx context.Context, db queryDB, actor uuid.UUID, lock bool) (*entity.AccessScope, error) {
	if actor == uuid.Nil || db == nil {
		return nil, agent.ErrForbidden
	}
	var role string
	var orgID *uuid.UUID
	query := `SELECT u.role, u.organization_id FROM users u
		JOIN auth_applications a ON a.id='manris' AND a.active
		WHERE u.id=$1 AND u.status='active' AND NOT u.must_change_password`
	if lock {
		query += ` FOR SHARE OF u,a`
	}
	if err := db.QueryRow(ctx, query, actor).Scan(&role, &orgID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, agent.ErrForbidden
		}
		return nil, safeDomainError(err)
	}
	role = entity.NormalizeRole(role)
	switch role {
	case entity.RoleSuperAdmin, entity.RoleUnit, entity.RoleReviewer, entity.RolePimpinan:
	default:
		return nil, agent.ErrForbidden
	}
	var hierarchy *service.OrganizationHierarchy
	if tx, ok := db.(pgx.Tx); ok {
		hierarchy = service.NewOrganizationHierarchy(postgres.NewOrganizationRepositoryWithTx(tx))
	} else {
		hierarchy = t.hierarchy
	}
	if hierarchy == nil {
		hierarchy = service.NewOrganizationHierarchy(postgres.NewOrganizationRepository(t.pool))
	}
	scope, err := hierarchy.ResolveAccessScope(ctx, actor, role, orgID)
	if err != nil {
		return nil, safeDomainError(err)
	}
	if !scope.IsGlobal && (scope.OrganizationID == nil || len(scope.AccessibleOrgIDs) == 0) {
		return nil, agent.ErrForbidden
	}
	return scope, nil
}

func (t *Toolkit) Authorize(ctx context.Context, actor uuid.UUID, organizationIDs []uuid.UUID) error {
	scope, err := t.resolveScope(ctx, t.pool, actor, false)
	if err != nil {
		return err
	}
	for _, id := range organizationIDs {
		if id == uuid.Nil || !scope.CanRead(id) {
			return agent.ErrForbidden
		}
	}
	return nil
}

func (t *Toolkit) Context(ctx context.Context, actor uuid.UUID) (agent.ApplicationContext, error) {
	scope, err := t.resolveScope(ctx, t.pool, actor, false)
	if err != nil {
		return agent.ApplicationContext{}, err
	}
	charterContext, err := loadRiskCharterDraftContext(ctx, postgres.NewRiskCharterRepository(t.pool), scope, t.currentCycle()[:4])
	if err != nil {
		return agent.ApplicationContext{}, safeDomainError(err)
	}
	ids := []uuid.UUID{}
	if scope.OrganizationID != nil {
		ids = append(ids, *scope.OrganizationID)
	}
	return agent.ApplicationContext{Content: content(map[string]any{
		"actorId": actor, "role": scope.Role, "organizationId": scope.OrganizationID,
		"accessibleOrganizationIds": scope.AccessibleOrgIDs, "global": scope.IsGlobal,
		"currentCycle": t.currentCycle(), "snapshotAt": t.now().UTC(),
		"riskCharterContext": charterContext,
		"rules":              "Cakupan operasional bawaan adalah organisasi sendiri. Organisasi turunan hanya dapat dibaca bila dipilih eksplisit. Risiko tinggi: nilai dibulatkan >=15. Risiko final tidak dapat diedit; reassess_risk memulai transaksi pemantauan kanonis pada periode yang valid, bukan membuat versi profil langsung. Risiko arsip tidak dapat dipantau. Kejadian adalah catatan tetap. PIC, skor, tanggal, dan bukti wajib bersumber dari pengguna/data. Jangan mengarang. Perubahan hanya usulan sampai dikonfirmasi pengguna.",
	}), OrganizationIDs: ids}, nil
}

func readScope(scope *entity.AccessScope, requested string) ([]uuid.UUID, error) {
	if scope == nil {
		return nil, agent.ErrForbidden
	}
	if requested != "" {
		id, err := uuid.Parse(requested)
		if err != nil || id == uuid.Nil {
			return nil, agent.ErrInvalid
		}
		if !scope.CanRead(id) {
			return nil, agent.ErrForbidden
		}
		return []uuid.UUID{id}, nil
	}
	if scope.OrganizationID != nil {
		return []uuid.UUID{*scope.OrganizationID}, nil
	}
	if scope.IsGlobal {
		return []uuid.UUID{}, nil
	}
	return nil, agent.ErrForbidden
}

func writeOrg(scope *entity.AccessScope, requested string) (uuid.UUID, error) {
	if scope == nil {
		return uuid.Nil, agent.ErrForbidden
	}
	if requested == "" {
		if scope.OrganizationID == nil {
			return uuid.Nil, invalid("pilih organisasi tujuan")
		}
		return *scope.OrganizationID, nil
	}
	id, err := uuid.Parse(requested)
	if err != nil || id == uuid.Nil {
		return uuid.Nil, agent.ErrInvalid
	}
	if !scope.CanWrite(id) {
		return uuid.Nil, agent.ErrForbidden
	}
	return id, nil
}
