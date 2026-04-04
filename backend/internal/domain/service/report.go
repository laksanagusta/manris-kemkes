package service

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

// ReportPDFRenderer renders a ReportData struct into PDF bytes
type ReportPDFRenderer interface {
	Render(ctx context.Context, data *entity.ReportData) ([]byte, error)
}
