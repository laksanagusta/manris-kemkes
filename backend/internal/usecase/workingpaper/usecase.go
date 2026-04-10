package workingpaper

import (
	"github.com/manris/backend/internal/domain/repository"
)

// UseCase provides working paper business operations.
// Dependencies will be extended in future tasks (e.g. QRCodeGenerator for signing).
type UseCase struct {
	wpRepo   repository.WorkingPaperRepository
	riskRepo repository.RiskRepository
}

// NewWorkingPaperUseCase creates a new working paper use case with required dependencies.
func NewWorkingPaperUseCase(
	wpRepo repository.WorkingPaperRepository,
	riskRepo repository.RiskRepository,
) *UseCase {
	return &UseCase{
		wpRepo:   wpRepo,
		riskRepo: riskRepo,
	}
}
