package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
)

// Read wrappers resolve the document's owner rather than the reader's home UPR.
// Mutation methods retain their existing own-organization predicates.
func (s *UPRWorkflow) AnnualProfileForScope(ctx context.Context, scope *entity.AccessScope, org uuid.UUID, year int, id uuid.UUID) (AnnualProfile, error) {
	if id != uuid.Nil {
		var err error
		org, err = annualProfileReadOrganization(ctx, s.pool, scope, id)
		if err != nil {
			return AnnualProfile{}, err
		}
	}
	if org == uuid.Nil || scope == nil || !scope.CanRead(org) {
		return AnnualProfile{}, ErrUPRNotFound
	}
	return s.AnnualProfile(ctx, org, year, id)
}

func (s *UPRWorkflow) GetReportDraftForScope(ctx context.Context, scope *entity.AccessScope, id uuid.UUID) (UPRReportDraft, error) {
	var org uuid.UUID
	if err := s.pool.QueryRow(ctx, `SELECT organization_id FROM upr_report_drafts WHERE id=$1`, id).Scan(&org); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return UPRReportDraft{}, ErrUPRNotFound
		}
		return UPRReportDraft{}, err
	}
	if scope == nil || !scope.CanRead(org) {
		return UPRReportDraft{}, ErrUPRNotFound
	}
	return s.GetReportDraft(ctx, org, id)
}

func (s *UPRWorkflow) ReportDetailForScope(ctx context.Context, scope *entity.AccessScope, org, id uuid.UUID) (UPRReportDetail, error) {
	if scope == nil {
		return UPRReportDetail{}, ErrUPRNotFound
	}
	var owner uuid.UUID
	if err := s.pool.QueryRow(ctx, `SELECT organization_id FROM upr_report_versions WHERE id=$1`, id).Scan(&owner); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return UPRReportDetail{}, ErrUPRNotFound
		}
		return UPRReportDetail{}, err
	}
	if scope.CanRead(owner) {
		org = owner
	}
	return s.ReportDetail(ctx, org, id)
}
