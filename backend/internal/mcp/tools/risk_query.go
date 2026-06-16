package tools

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/mapping"
	"github.com/manris/backend/internal/mcp/session"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

var (
	ErrNotAuthenticated = errors.New("tidak terautentikasi")
)

// RiskGetUseCaseI defines the interface for getting a single risk
type RiskGetUseCaseI interface {
	Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error)
}

// RiskListUseCaseI defines the interface for listing risks
type RiskListUseCaseI interface {
	Execute(ctx context.Context, input riskuc.ListRisksInput) ([]*entity.Risk, error)
}

// HandleGetRisk retrieves a single risk by ID with session authentication
func HandleGetRisk(ctx context.Context, uc RiskGetUseCaseI, sess *session.Session, idStr string) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, fmt.Errorf("ID risiko tidak valid: %w", err)
	}

	// Call the usecase with parsed UUID and org IDs from session
	risk, err := uc.Execute(ctx, id, sess.AccessibleOrgIDs)
	if err != nil {
		return nil, err
	}

	// Convert risk to output map
	return riskToMap(risk), nil
}

// HandleListRisks lists risks with session authentication and filtering
func HandleListRisks(ctx context.Context, uc RiskListUseCaseI, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	// Convert args to usecase input with org-scope validation
	input, err := mapping.ToListRisksInput(args, sess)
	if err != nil {
		return nil, err
	}

	// Call the usecase
	risks, err := uc.Execute(ctx, input)
	if err != nil {
		return nil, err
	}

	// Convert risks to output format
	items := make([]map[string]interface{}, len(risks))
	for i, risk := range risks {
		items[i] = riskToMap(risk)
	}

	return map[string]interface{}{
		"items": items,
		"count": len(items),
	}, nil
}

// riskToMap converts a Risk entity to a map for JSON output
func riskToMap(risk *entity.Risk) map[string]interface{} {
	m := map[string]interface{}{
		"id":             risk.ID.String(),
		"code":           risk.Code,
		"title":          risk.Title,
		"description":    risk.Description,
		"category":       risk.Category,
		"status":         risk.Status,
		"versionGroupId": risk.VersionGroupID.String(),
		"isCurrent":      risk.IsCurrent,
		"isCycleCurrent": risk.IsCycleCurrent,
		"versionNumber":  risk.VersionNumber,
		"orgName":        risk.OrgName,
		"createdByName":  risk.CreatedByName,
	}

	// Optional fields
	if risk.OrganizationID != nil {
		m["organizationId"] = risk.OrganizationID.String()
	}
	if risk.PreviousRiskID != nil {
		m["previousRiskId"] = risk.PreviousRiskID.String()
	}
	if risk.ArchivedAt != nil {
		m["archivedAt"] = risk.ArchivedAt.Format("2006-01-02T15:04:05Z07:00")
	}
	if risk.ArchivedReason != "" {
		m["archivedReason"] = risk.ArchivedReason
	}
	if risk.CreatedBy != nil {
		m["createdBy"] = risk.CreatedBy.String()
	}
	if risk.RiskOwnerID != nil {
		m["riskOwnerId"] = risk.RiskOwnerID.String()
	}
	if risk.ControlOwnerID != nil {
		m["controlOwnerId"] = risk.ControlOwnerID.String()
	}

	return m
}
