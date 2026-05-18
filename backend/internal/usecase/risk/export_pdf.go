package risk

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	domainsvc "github.com/manris/backend/internal/domain/service"
)

type riskDetailGetter interface {
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error)
}

type ExportRiskPDFInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

type ExportRiskPDFResult struct {
	Filename string
	Bytes    []byte
}

type ExportRiskPDFUseCase struct {
	riskRepo riskDetailGetter
	renderer domainsvc.RiskDetailPDFRenderer
}

func NewExportRiskPDFUseCase(
	riskRepo riskDetailGetter,
	renderer domainsvc.RiskDetailPDFRenderer,
) *ExportRiskPDFUseCase {
	return &ExportRiskPDFUseCase{
		riskRepo: riskRepo,
		renderer: renderer,
	}
}

func (uc *ExportRiskPDFUseCase) Execute(ctx context.Context, input ExportRiskPDFInput) (*ExportRiskPDFResult, error) {
	if uc == nil || uc.riskRepo == nil || uc.renderer == nil {
		return nil, domainerrors.Wrap(domainerrors.ErrInternal, "risk pdf export dependencies are not configured")
	}

	orgIDs, err := exportRiskScopeOrgIDs(input.Scope)
	if err != nil {
		return nil, err
	}

	risk, err := uc.riskRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil || risk == nil {
		return nil, domainerrors.ErrRiskNotFound
	}

	if risk.Status != entity.RiskStatusApproved {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidStatus, "risk pdf export is only available for finalized risks")
	}

	data := buildRiskDetailPDFData(risk)
	bytesOut, err := uc.renderer.RenderRiskDetail(ctx, data)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to render risk detail pdf")
	}
	if len(bytesOut) == 0 {
		return nil, domainerrors.Wrap(domainerrors.ErrInternal, "risk pdf renderer returned empty bytes")
	}

	return &ExportRiskPDFResult{
		Filename: buildRiskDetailPDFFilename(risk),
		Bytes:    bytesOut,
	}, nil
}

func exportRiskScopeOrgIDs(scope *entity.AccessScope) ([]uuid.UUID, error) {
	if scope == nil || scope.IsGlobal {
		return nil, nil
	}
	if len(scope.AccessibleOrgIDs) > 0 {
		return scope.AccessibleOrgIDs, nil
	}
	if scope.OrganizationID != nil {
		return []uuid.UUID{*scope.OrganizationID}, nil
	}
	return nil, domainerrors.ErrForbidden
}

func buildRiskDetailPDFData(risk *entity.Risk) *entity.RiskDetailPDFData {
	if risk == nil {
		return nil
	}

	return &entity.RiskDetailPDFData{
		Title:                risk.Title,
		Code:                 risk.Code,
		Status:               risk.Status,
		OrganizationName:     risk.OrgName,
		CategoryLabel:        riskCategoryLabel(risk.Category),
		RiskSource:           entity.GetRiskSourceDisplay(risk.RiskSource),
		Controllability:      entity.GetControllabilityDisplay(risk.Controllability),
		AssessmentCycle:      risk.AssessmentCycle,
		Description:          risk.Description,
		Causes:               append([]string(nil), risk.Cause...),
		Impacts:              append([]string(nil), risk.ImpactDesc...),
		ExistingControl:      risk.ExistingControl,
		ControlEffectiveness: entity.GetControlEffectivenessDisplay(risk.ControlEffectiveness),
		Probability:          risk.Probability,
		Impact:               risk.Impact,
		Weight:               risk.Weight,
		Nilai:                risk.EffectiveNilai(),
		InherentScore:        risk.GetEffectiveScore(),
		RiskLevelLabel:       entity.GetRiskLevelDisplay(risk.GetRiskLevel()),
		RiskPriority:         risk.GetRiskPriority(),
		RiskAppetite:         entity.GetRiskAppetiteDisplay(risk.RiskAppetite),
		IsRiskUtamaLabel:     yesNoLabel(risk.IsRiskUtama()),
		TreatmentOption:      entity.GetTreatmentOptionDisplay(risk.TreatmentOption),
		ReviewSummary:        strings.TrimSpace(risk.ReviewSummary),
		TargetProbability:    risk.TargetProbability,
		TargetImpact:         risk.TargetImpact,
		TargetWeight:         risk.TargetWeight,
		TargetNilai:          risk.TargetNilai,
		Mitigations:          append([]entity.Mitigation(nil), risk.Mitigations...),
		CreatedByName:        risk.CreatedByName,
		CreatedAt:            risk.CreatedAt,
		UpdatedAt:            risk.UpdatedAt,
	}
}

func buildRiskDetailPDFFilename(risk *entity.Risk) string {
	base := risk.Code
	if strings.TrimSpace(base) == "" {
		base = risk.ID.String()
	}
	return fmt.Sprintf("lampiran-risiko-%s.pdf", sanitizeFilenamePart(base))
}

func riskCategoryLabel(category string) string {
	switch category {
	case entity.RiskCategoryKebijakan:
		return "Kebijakan"
	case entity.RiskCategoryOperasional:
		return "Operasional"
	case entity.RiskCategoryKepatuhan:
		return "Kepatuhan"
	case entity.RiskCategoryFraud:
		return "Fraud / Korupsi"
	case entity.RiskCategoryReputasi:
		return "Reputasi"
	case entity.RiskCategoryLegal:
		return "Legal"
	default:
		return category
	}
}

func yesNoLabel(v bool) string {
	if v {
		return "Ya"
	}
	return "Tidak"
}

var filenameCleaner = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func sanitizeFilenamePart(value string) string {
	value = strings.TrimSpace(value)
	value = filenameCleaner.ReplaceAllString(value, "-")
	value = strings.Trim(value, "-_.")
	if value == "" {
		return "risk"
	}
	return value
}
