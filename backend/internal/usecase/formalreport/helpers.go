package formalreport

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func normalizeFormalReportType(reportType string) string {
	return strings.TrimSpace(reportType)
}

func buildFormalReportDownloadURL(id uuid.UUID) string {
	return fmt.Sprintf("/api/v1/formal-reports/%s/download", id.String())
}

func formalReportHeadline(reportType string) string {
	switch reportType {
	case entity.FormalReportTypeAnnualRiskProfile:
		return "Profil risiko tahunan"
	case entity.FormalReportTypeSemiannualImplementation:
		return "Laporan penerapan manajemen risiko semesteran"
	case entity.FormalReportTypeSemiannualSupervision:
		return "Laporan pengawasan manajemen risiko semesteran"
	case entity.FormalReportTypeTMPMR:
		return "Laporan TMPMR"
	default:
		return "Laporan formal"
	}
}

func formalReportMetadata(orgID uuid.UUID, period, reportType string, generatedAt time.Time, summary map[string]any) map[string]any {
	return map[string]any{
		"organizationId": orgID.String(),
		"period":         period,
		"reportType":     reportType,
		"generatedAt":    generatedAt.UTC().Format(time.RFC3339),
		"summary":        summary,
	}
}

func validateFormalReportAccess(scope *entity.AccessScope, orgID uuid.UUID, write bool) error {
	if scope == nil {
		return domainerrors.ErrForbidden
	}
	if write {
		if scope.CanWrite(orgID) {
			return nil
		}
		return domainerrors.ErrForbidden
	}
	if scope.CanRead(orgID) {
		return nil
	}
	return domainerrors.ErrForbidden
}
