package service

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

type QuarterlyReportPDFRenderer interface {
	RenderQuarterly(context.Context, *entity.QuarterlyReportData) ([]byte, error)
}
