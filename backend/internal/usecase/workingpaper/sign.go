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

func (uc *UseCase) Sign(ctx context.Context, workingPaperID uuid.UUID, signerUserID uuid.UUID) (*entity.WorkingPaper, error) {
	wp, err := uc.wpRepo.MutateByIDForUpdate(ctx, workingPaperID, func(wp *entity.WorkingPaper) error {
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
			SignerTitle:       nextSig.SignerTitle,
			SignerRoleLabel:   nextSig.SignerRoleLabel,
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
