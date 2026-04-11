package entity

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// Working Paper Status constants
const (
	WorkingPaperStatusDraft     = "draft"
	WorkingPaperStatusSigning   = "signing"
	WorkingPaperStatusCompleted = "completed"
	WorkingPaperStatusCancelled = "cancelled"
)

type WorkingPaper struct {
	ID                       uuid.UUID              `json:"id"`
	Title                    string                 `json:"title"`
	Description              string                 `json:"description"`
	OrgID                    uuid.UUID              `json:"org_id"`
	Status                   string                 `json:"status"` // draft, signing, completed, cancelled
	AssessmentCycle          string                 `json:"assessment_cycle"`
	Risks                    []WorkingPaperRiskLink `json:"risks"`
	DocumentHash             string                 `json:"document_hash"`
	CurrentSignatorySequence int                    `json:"current_signatory_sequence"` // 0-based: next signatory index
	CreatedBy                uuid.UUID              `json:"created_by"`
	CreatedAt                time.Time              `json:"created_at"`
	UpdatedAt                time.Time              `json:"updated_at"`
	CompletedAt              *time.Time             `json:"completed_at,omitempty"`
	CancelledAt              *time.Time             `json:"cancelled_at,omitempty"`

	// Joined data
	Signatories []WorkingPaperSignatory `json:"signatories"`
}

type WorkingPaperRiskLink struct {
	ID             uuid.UUID            `json:"id"`
	WorkingPaperID uuid.UUID            `json:"working_paper_id"`
	RiskID         uuid.UUID            `json:"risk_id"`
	SortOrder      int                  `json:"sort_order"`
	SourceMode     string               `json:"source_mode"`
	CreatedAt      time.Time            `json:"created_at"`
	Risk           WorkingPaperRiskData `json:"risk"`
}

type WorkingPaperRiskData struct {
	ID                   uuid.UUID `json:"id"`
	Code                 string    `json:"code"`
	Title                string    `json:"title"`
	Description          string    `json:"description"`
	Category             string    `json:"category"`
	Status               string    `json:"status"`
	OrgName              string    `json:"org_name"`
	Probability          int       `json:"probability"`
	Impact               int       `json:"impact"`
	Bobot                float64   `json:"bobot"`
	Nilai                float64   `json:"nilai"`
	TingkatRisiko        string    `json:"tingkat_risiko"`
	PrioritasRisiko      int       `json:"prioritas_risiko"`
	Cause                []string  `json:"cause,omitempty"`
	RiskSource           string    `json:"risk_source,omitempty"`
	Controllability      string    `json:"controllability,omitempty"`
	ImpactDesc           []string  `json:"impact_desc,omitempty"`
	ExistingControl      string    `json:"existing_control,omitempty"`
	ControlEffectiveness string    `json:"control_effectiveness,omitempty"`
	RiskAppetite         string    `json:"risk_appetite,omitempty"`
	TreatmentOption      string    `json:"treatment_option,omitempty"`
	TargetProbability    int       `json:"target_probability,omitempty"`
	TargetImpact         int       `json:"target_impact,omitempty"`
	TargetBobot          float64   `json:"target_bobot,omitempty"`
	TargetNilai          float64   `json:"target_nilai,omitempty"`
	TargetTingkatRisiko  string    `json:"target_tingkat_risiko,omitempty"`
	AssessmentCycle      string    `json:"assessment_cycle,omitempty"`
}

func (r *WorkingPaperRiskData) NormalizeDerivedScores() {
	if r.Bobot == 0 && r.Probability > 0 && r.Impact > 0 {
		r.Bobot = GetBobot(r.Probability, r.Impact)
	}
	if r.Nilai == 0 && r.Bobot > 0 && r.Probability > 0 && r.Impact > 0 {
		r.Nilai = CalculateNilai(r.Probability, r.Impact, r.Bobot)
	}
	r.TingkatRisiko = GetRiskLevelFromNilai(r.Nilai)
	r.PrioritasRisiko = GetRiskPriorityFromLevel(r.TingkatRisiko)

	if r.TargetBobot == 0 && r.TargetProbability > 0 && r.TargetImpact > 0 {
		r.TargetBobot = GetBobot(r.TargetProbability, r.TargetImpact)
	}
	if r.TargetNilai == 0 && r.TargetBobot > 0 && r.TargetProbability > 0 && r.TargetImpact > 0 {
		r.TargetNilai = CalculateNilai(r.TargetProbability, r.TargetImpact, r.TargetBobot)
	}
	if r.TargetNilai > 0 {
		r.TargetTingkatRisiko = GetRiskLevelFromNilai(r.TargetNilai)
	}
}

// WorkingPaperSignatory represents a signer in the workflow
type WorkingPaperSignatory struct {
	ID              uuid.UUID       `json:"id"`
	WorkingPaperID  uuid.UUID       `json:"working_paper_id"`
	UserID          uuid.UUID       `json:"user_id"`
	SequenceNo      int             `json:"sequence_no"` // 1-based sequence order
	SignerName      string          `json:"signer_name"`
	SignerNIP       string          `json:"signer_nip"`
	SignerTitle     string          `json:"signer_title"`
	SignerRoleLabel string          `json:"signer_role_label"`
	Status          string          `json:"status"` // pending, signed
	SignedAt        *time.Time      `json:"signed_at,omitempty"`
	QRCodePNG       string          `json:"qr_code_png,omitempty"` // base64 PNG
	QRData          json.RawMessage `json:"qr_data,omitempty"`     // JSON with signing metadata
}

// Validate performs domain validation on WorkingPaper
func (wp *WorkingPaper) Validate() error {
	if wp.Title == "" {
		return errors.ErrInvalidTitle
	}
	if len(wp.Risks) == 0 {
		return &errors.AppError{
			Code:    "INVALID_RISKS",
			Message: "at least one linked risk is required",
		}
	}
	if len(wp.Signatories) == 0 {
		return &errors.AppError{
			Code:    "INVALID_SIGNATORIES",
			Message: "at least one signatory is required",
		}
	}
	return nil
}

// CanSign checks if the given user is the next signatory
func (wp *WorkingPaper) CanSign(userID uuid.UUID) (bool, error) {
	if wp.Status != WorkingPaperStatusDraft && wp.Status != WorkingPaperStatusSigning {
		return false, &errors.AppError{
			Code:    "INVALID_STATUS",
			Message: "working paper is not in signing status",
		}
	}

	nextSig := wp.NextSignatory()
	if nextSig == nil {
		return false, &errors.AppError{
			Code:    "NO_PENDING_SIGNATORIES",
			Message: "no pending signatories found",
		}
	}

	return nextSig.UserID == userID, nil
}

// CanDelete checks if the working paper can be deleted (only draft status)
func (wp *WorkingPaper) CanDelete() bool {
	return wp.Status == WorkingPaperStatusDraft
}

// CanCancel checks if the working paper can be cancelled
func (wp *WorkingPaper) CanCancel() bool {
	return wp.Status != WorkingPaperStatusCompleted
}

// IsComplete checks if the working paper is completed
func (wp *WorkingPaper) IsComplete() bool {
	return wp.Status == WorkingPaperStatusCompleted
}

// NextSignatory returns the next pending signatory
func (wp *WorkingPaper) NextSignatory() *WorkingPaperSignatory {
	for _, sig := range wp.Signatories {
		if sig.SequenceNo == wp.CurrentSignatorySequence+1 && sig.Status == "pending" {
			return &sig
		}
	}
	return nil
}

// MarkSigned marks a signatory as signed and advances the sequence
func (wp *WorkingPaper) MarkSigned(signatoryID uuid.UUID, qrPNG string, qrData json.RawMessage) error {
	nextSig := wp.NextSignatory()
	if nextSig == nil || nextSig.ID != signatoryID {
		return &errors.AppError{
			Code:    "INVALID_SIGNATORY",
			Message: "signatory is not the next in sequence",
		}
	}

	// Find and update the signatory
	for i := range wp.Signatories {
		if wp.Signatories[i].ID == signatoryID {
			now := time.Now()
			wp.Signatories[i].Status = "signed"
			wp.Signatories[i].SignedAt = &now
			wp.Signatories[i].QRCodePNG = qrPNG
			wp.Signatories[i].QRData = qrData
			break
		}
	}

	// Advance sequence
	wp.CurrentSignatorySequence++

	// Check if all signatories are signed
	allSigned := true
	for _, sig := range wp.Signatories {
		if sig.Status != "signed" {
			allSigned = false
			break
		}
	}

	if allSigned {
		wp.Status = WorkingPaperStatusCompleted
		now := time.Now()
		wp.CompletedAt = &now
	} else {
		wp.Status = WorkingPaperStatusSigning
	}

	wp.UpdatedAt = time.Now()
	return nil
}

func (wp *WorkingPaper) ComputeHash() string {
	payload := struct {
		Title           string                 `json:"title"`
		AssessmentCycle string                 `json:"assessment_cycle"`
		Risks           []WorkingPaperRiskLink `json:"risks"`
	}{
		Title:           wp.Title,
		AssessmentCycle: wp.AssessmentCycle,
		Risks:           wp.Risks,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return ""
	}

	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}
