package entity

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

type workingPaperSigningContent struct {
	ID              uuid.UUID               `json:"id"`
	OrgID           uuid.UUID               `json:"org_id"`
	Code            string                  `json:"code"`
	Title           string                  `json:"title"`
	AssessmentCycle string                  `json:"assessment_cycle"`
	CreatedAt       time.Time               `json:"created_at"`
	Risks           []WorkingPaperRiskLink  `json:"risks"`
	Signatories     []WorkingPaperSignatory `json:"signatories"`
}

func (wp *WorkingPaper) signingContent() ([]byte, error) {
	signatories := append([]WorkingPaperSignatory(nil), wp.Signatories...)
	for i := range signatories {
		signatories[i].Status = ""
		signatories[i].SignedAt = nil
		signatories[i].QRCodePNG = ""
		signatories[i].QRData = nil
	}
	return json.Marshal(workingPaperSigningContent{
		ID: wp.ID, OrgID: wp.OrgID, Code: wp.Code, Title: wp.Title,
		AssessmentCycle: wp.AssessmentCycle, CreatedAt: wp.CreatedAt,
		Risks: wp.Risks, Signatories: signatories,
	})
}

func signingContentHash(content []byte) string {
	digest := sha256.Sum256(content)
	return hex.EncodeToString(digest[:])
}

func (wp *WorkingPaper) SigningReviewHash() (string, error) {
	content, err := wp.signingContent()
	if err != nil {
		return "", fmt.Errorf("encode working paper review: %w", err)
	}
	return signingContentHash(content), nil
}

func (wp *WorkingPaper) LockSigningContent(reviewedHash string) error {
	content, err := wp.signingContent()
	if err != nil {
		return fmt.Errorf("encode working paper signing snapshot: %w", err)
	}
	hash := signingContentHash(content)
	if reviewedHash != hash {
		return &errors.AppError{
			Code:    "WORKING_PAPER_REVIEW_CHANGED",
			Message: "Isi Kertas Kerja berubah. Tinjau kembali sebelum memulai TTE.",
		}
	}
	wp.SigningSnapshot = content
	wp.DocumentHash = hash
	wp.ContentLocked = true
	wp.ReviewHash = ""
	return nil
}

// RestoreSigningContent keeps document content fixed and restores each signer's live progress.
func (wp *WorkingPaper) RestoreSigningContent() error {
	if len(wp.SigningSnapshot) == 0 {
		return nil
	}
	if signingContentHash(wp.SigningSnapshot) != wp.DocumentHash {
		return fmt.Errorf("working paper signing snapshot does not match its document hash")
	}
	var content workingPaperSigningContent
	if err := json.Unmarshal(wp.SigningSnapshot, &content); err != nil {
		return fmt.Errorf("decode working paper signing snapshot: %w", err)
	}
	if content.ID != wp.ID || content.OrgID != wp.OrgID {
		return fmt.Errorf("working paper signing snapshot belongs to a different paper")
	}

	progressByID := make(map[uuid.UUID]WorkingPaperSignatory, len(wp.Signatories))
	for _, signatory := range wp.Signatories {
		progressByID[signatory.ID] = signatory
	}
	for i := range content.Signatories {
		signatory := &content.Signatories[i]
		progress, ok := progressByID[signatory.ID]
		if !ok {
			return fmt.Errorf("working paper signing progress missing for signatory %s", signatory.ID)
		}
		signatory.Status = progress.Status
		signatory.SignedAt = progress.SignedAt
		signatory.QRCodePNG = progress.QRCodePNG
		signatory.QRData = progress.QRData
	}
	wp.Code = content.Code
	wp.Title = content.Title
	wp.AssessmentCycle = content.AssessmentCycle
	wp.CreatedAt = content.CreatedAt
	wp.Risks = content.Risks
	wp.Signatories = content.Signatories
	wp.ContentLocked = true
	return nil
}
