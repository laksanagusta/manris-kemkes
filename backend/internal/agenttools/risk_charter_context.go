package agenttools

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/repository/postgres"
	riskcharteruc "github.com/manris/backend/internal/usecase/riskcharter"
)

const maxRiskCharterContextBytes = 16000

type charterDraftSource struct {
	ID                 uuid.UUID           `json:"id"`
	Title              string              `json:"title"`
	OrganizationID     uuid.UUID           `json:"organizationId"`
	Period             string              `json:"period"`
	UPRLevel           string              `json:"uprLevel"`
	VersionNumber      int                 `json:"versionNumber"`
	Scope              string              `json:"scope"`
	LegalBasis         string              `json:"legalBasis,omitempty"`
	LegalBases         []map[string]string `json:"legalBases"`
	InternalContext    string              `json:"internalContext"`
	ExternalContext    string              `json:"externalContext"`
	StakeholderSummary string              `json:"stakeholderSummary,omitempty"`
	Stakeholders       []map[string]string `json:"stakeholders"`
	Href               string              `json:"href"`
}
type charterDraftContext struct {
	Status         string               `json:"status"`
	OrganizationID *uuid.UUID           `json:"organizationId"`
	Year           string               `json:"year"`
	Charters       []charterDraftSource `json:"charters"`
	Warning        string               `json:"warning,omitempty"`
}

// Reuse the charter workflow's home-organization access rule, including for admins.
// Exclude personal UPR membership and workflow/audit identities from model context.
func loadRiskCharterDraftContext(ctx context.Context, repo repository.RiskCharterRepository, scope *entity.AccessScope, year string) (charterDraftContext, error) {
	result := charterDraftContext{Status: "unavailable", Year: year, Charters: []charterDraftSource{}}
	if scope == nil {
		return result, domainerrors.ErrForbidden
	}
	result.OrganizationID = scope.OrganizationID
	if len(year) != 4 || strings.IndexFunc(year, func(r rune) bool { return r < '0' || r > '9' }) != -1 {
		return result, invalid("tahun piagam harus YYYY")
	}
	if scope.OrganizationID == nil {
		result.Warning = "Organisasi akun belum tersedia; konteks piagam tidak dimuat."
		return result, nil
	}
	listing, err := riskcharteruc.NewListRiskChartersUseCase(repo).Execute(ctx, riskcharteruc.ListRiskChartersInput{Period: year, Page: 1, Limit: 100, Scope: scope})
	if err != nil {
		return result, err
	}
	if listing.Total > len(listing.Data) {
		result.Status = "too_large"
		result.Warning = "Jumlah piagam melampaui batas konteks; jangan menganggap piagam sudah dibaca."
		return result, nil
	}
	for _, charter := range listing.Data {
		if charter == nil {
			continue
		}
		if charter.OrganizationID != *scope.OrganizationID {
			return result, domainerrors.ErrForbidden
		}
		eligible := charter.IsCurrent && charter.Status == entity.RiskCharterStatusActive && charter.Period == year
		if !eligible {
			continue
		}
		item := charterDraftSource{ID: charter.ID, Title: charter.Title, OrganizationID: charter.OrganizationID, Period: charter.Period, UPRLevel: charter.UPRLevel, VersionNumber: charter.VersionNumber, Scope: charter.Scope, LegalBasis: charter.LegalBasis, LegalBases: []map[string]string{}, InternalContext: charter.InternalContext, ExternalContext: charter.ExternalContext, StakeholderSummary: charter.StakeholderSummary, Stakeholders: []map[string]string{}, Href: "/management/charters/" + charter.ID.String()}
		for _, basis := range charter.LegalBases {
			item.LegalBases = append(item.LegalBases, map[string]string{"reference": basis.Reference, "provision": basis.Provision})
		}
		for _, stakeholder := range charter.Stakeholders {
			item.Stakeholders = append(item.Stakeholders, map[string]string{"name": stakeholder.Name, "relationship": stakeholder.Relationship})
		}
		result.Charters = append(result.Charters, item)
	}
	if len(result.Charters) == 0 {
		result.Warning = "Piagam risiko aktif untuk organisasi dan tahun ini belum tersedia. Jangan mengarang isi piagam; minta konteks kegiatan bila diperlukan."
		return result, nil
	}
	result.Status = "available"
	raw, err := json.Marshal(result)
	if err != nil {
		return result, err
	}
	if len(raw) > maxRiskCharterContextBytes {
		result.Status = "too_large"
		result.Charters = []charterDraftSource{}
		result.Warning = "Isi piagam melebihi batas konteks; piagam belum dimuat. Minta ringkasan ruang lingkup/kegiatan yang relevan sebelum memakai konteks piagam."
	}
	return result, nil
}

func (t *Toolkit) executeRiskCharterContext(ctx context.Context, actor uuid.UUID, raw json.RawMessage) (agent.ToolResult, error) {
	var input struct {
		Year string `json:"year"`
	}
	if err := strictDecode(raw, &input); err != nil {
		return agent.ToolResult{}, err
	}
	if input.Year == "" {
		input.Year = t.currentCycle()[:4]
	}
	scope, err := t.resolveScope(ctx, t.pool, actor, false)
	if err != nil {
		return agent.ToolResult{}, err
	}
	result, err := loadRiskCharterDraftContext(ctx, postgres.NewRiskCharterRepository(t.pool), scope, input.Year)
	if err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	ids := []uuid.UUID{}
	if scope.OrganizationID != nil {
		ids = append(ids, *scope.OrganizationID)
	}
	return agent.ToolResult{Content: content(result), OrganizationIDs: ids}, nil
}
