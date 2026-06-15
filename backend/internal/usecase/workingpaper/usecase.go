package workingpaper

import (
	"github.com/manris/backend/internal/domain/repository"
)

type UseCase struct {
	wpRepo         repository.WorkingPaperRepository
	riskRepo       repository.RiskRepository
	monitoringRepo repository.RiskMonitoringRepository
}

func NewWorkingPaperUseCase(
	wpRepo repository.WorkingPaperRepository,
	riskRepo repository.RiskRepository,
	monitoringRepo repository.RiskMonitoringRepository,
) *UseCase {
	return &UseCase{
		wpRepo:         wpRepo,
		riskRepo:       riskRepo,
		monitoringRepo: monitoringRepo,
	}
}
