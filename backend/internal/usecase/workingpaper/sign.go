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
	wp, err := uc.wpRepo.GetByIDForUpdate(ctx, workingPaperID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to fetch working paper for signing")
	}

	canSign, err := wp.CanSign(signerUserID)
	if err != nil {
		return nil, err
	}
	if !canSign {
		return nil, &domainerrors.AppError{Code: "FORBIDDEN", Message: "not your turn to sign"}
	}

	nextSig := wp.NextSignatory()

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
		return nil, domainerrors.Wrap(err, "failed to generate QR code")
	}

	qrData, err := json.Marshal(payload)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to marshal QR data")
	}

	if err := wp.MarkSigned(nextSig.ID, qrPNG, json.RawMessage(qrData)); err != nil {
		return nil, err
	}

	var signedSig *entity.WorkingPaperSignatory
	for i := range wp.Signatories {
		if wp.Signatories[i].ID == nextSig.ID {
			signedSig = &wp.Signatories[i]
			break
		}
	}

	if err := uc.wpRepo.UpdateSignatory(ctx, signedSig); err != nil {
		return nil, domainerrors.Wrap(err, "failed to update signatory")
	}

	if err := uc.wpRepo.Update(ctx, wp); err != nil {
		return nil, domainerrors.Wrap(err, "failed to update working paper")
	}

	return wp, nil
}
