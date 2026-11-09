package workingpaper

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/pkg/qrcode"
)

func workingPaperSigningBlockers(wp *entity.WorkingPaper) []entity.WorkingPaperSigningBlocker {
	blockers := make([]entity.WorkingPaperSigningBlocker, 0)
	// Legacy papers may predate monitoring links. Period rosters require a
	// final monitoring result for every included risk, even when all are missing.
	requiresMonitoring := false
	for _, link := range wp.Risks {
		if link.SourceMode == "roster" || link.Risk.Monitoring != nil {
			requiresMonitoring = true
			break
		}
	}
	if !requiresMonitoring {
		return blockers
	}

	for _, link := range wp.Risks {
		monitoring := link.Risk.Monitoring
		wrongPeriod := link.SourceMode == "roster" && monitoring != nil && monitoring.AssessmentCycle != wp.AssessmentCycle
		if monitoring == nil || monitoring.Status != entity.RiskMonitoringStatusFinalized || wrongPeriod {
			status := "missing"
			if wrongPeriod {
				status = "wrong_period"
			} else if monitoring != nil && monitoring.Status != "" {
				status = monitoring.Status
			}
			blockers = append(blockers, entity.WorkingPaperSigningBlocker{
				VersionGroupID:   link.VersionGroupID,
				Code:             link.Risk.Code,
				Title:            link.Risk.Title,
				MonitoringStatus: status,
			})
		}
	}

	return blockers
}

func (uc *UseCase) Sign(ctx context.Context, workingPaperID uuid.UUID, signerUserID uuid.UUID) (*entity.WorkingPaper, error) {
	wp, err := uc.wpRepo.MutateByIDForUpdate(ctx, workingPaperID, func(wp *entity.WorkingPaper) error {
		if blockers := workingPaperSigningBlockers(wp); len(blockers) > 0 {
			return &domainerrors.AppError{
				Code:    "MONITORING_INCOMPLETE",
				Message: "monitoring must be finalized before signing",
				Details: blockers,
			}
		}

		for _, link := range wp.Risks {
			if link.Risk.Status != entity.RiskStatusApproved {
				return &domainerrors.AppError{Code: "RISKS_NOT_APPROVED", Message: "semua risiko harus berstatus approved sebelum dapat ditandatangani"}
			}
		}

		canSign, err := wp.CanSign(signerUserID)
		if err != nil {
			return err
		}
		if !canSign {
			return &domainerrors.AppError{Code: "FORBIDDEN", Message: "not your turn to sign"}
		}

		nextSig := wp.NextSignatory()

		if wp.DocumentHash == "" {
			wp.DocumentHash = wp.ComputeHash()
		}

		now := time.Now()
		payload := qrcode.QRPayload{
			WorkingPaperID:    workingPaperID.String(),
			WorkingPaperTitle: wp.Title,
			DocumentHash:      wp.DocumentHash,
			SignerName:        nextSig.SignerName,
			SignerNIP:         nextSig.SignerNIP,
			SignerJabatan:     nextSig.SignerJabatan,
			SignerPangkat:     nextSig.SignerPangkat,
			SignedAt:          now,
		}

		qrPNG, err := qrcode.GenerateQRCode(payload)
		if err != nil {
			return domainerrors.Wrap(err, "failed to generate QR code")
		}

		qrData, err := json.Marshal(payload)
		if err != nil {
			return domainerrors.Wrap(err, "failed to marshal QR data")
		}

		return wp.MarkSigned(nextSig.ID, qrPNG, json.RawMessage(qrData))
	})
	if err != nil {
		return nil, err
	}

	return wp, nil
}
