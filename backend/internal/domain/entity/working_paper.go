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

// WorkingPaper represents a digitally-signed working paper containing risk snapshots
type WorkingPaper struct {
	ID                       uuid.UUID      `json:"id"`
	Title                    string         `json:"title"`
	Description              string         `json:"description"`
	OrgID                    uuid.UUID      `json:"org_id"`
	Status                   string         `json:"status"` // draft, signing, completed, cancelled
	AssessmentCycle          string         `json:"assessment_cycle"`
	RiskSnapshots            []RiskSnapshot `json:"risk_snapshots"`
	DocumentHash             string         `json:"document_hash"`              // SHA-256 hex of RiskSnapshots JSON
	CurrentSignatorySequence int            `json:"current_signatory_sequence"` // 0-based: next signatory index
	CreatedBy                uuid.UUID      `json:"created_by"`
	CreatedAt                time.Time      `json:"created_at"`
	UpdatedAt                time.Time      `json:"updated_at"`
	CompletedAt              *time.Time     `json:"completed_at,omitempty"`
	CancelledAt              *time.Time     `json:"cancelled_at,omitempty"`

	// Joined data
	Signatories []WorkingPaperSignatory `json:"signatories"`
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

// RiskSnapshot captures a point-in-time risk for inclusion in the working paper
// Maps to all fields needed by the 3 Excel templates
type RiskSnapshot struct {
	OriginalRiskID                  uuid.UUID `json:"original_risk_id"`
	Code                            string    `json:"code"`
	Title                           string    `json:"title"`
	Description                     string    `json:"description"`
	Category                        string    `json:"category"`
	OrgName                         string    `json:"org_name"`
	Probability                     int       `json:"probability"`
	Impact                          int       `json:"impact"`
	Bobot                           float64   `json:"bobot"` // Weight
	Nilai                           float64   `json:"nilai"`
	TingkatRisiko                   string    `json:"tingkat_risiko"`       // Risk level
	PrioritasRisiko                 int       `json:"prioritas_risiko"`     // Priority
	Sebab                           []string  `json:"sebab"`                // Causes
	SumberRisiko                    string    `json:"sumber_risiko"`        // Risk source
	ControlUncontrol                string    `json:"control_uncontrol"`    // Controllability
	Dampak                          []string  `json:"dampak"`               // Impact descriptions
	PengendalianUraian              string    `json:"pengendalian_uraian"`  // Existing control
	PengendalianEfektif             string    `json:"pengendalian_efektif"` // Control effectiveness
	PengendalianAdaTidakEfektif     string    `json:"pengendalian_ada_tidak_efektif"`
	SeleraRisiko                    string    `json:"selera_risiko"`        // Risk appetite
	PenangananRisiko                string    `json:"penanganan_risiko"`    // Treatment option
	RPRUraian                       string    `json:"rpr_uraian"`           // Mitigation description
	RPRJadwal                       string    `json:"rpr_jadwal"`           // Mitigation schedule
	RPRPenanggungJawab              string    `json:"rpr_penanggung_jawab"` // Mitigation owner
	TargetP                         int       `json:"target_p"`
	TargetD                         int       `json:"target_d"`
	TargetBobot                     float64   `json:"target_bobot"`
	TargetNilai                     float64   `json:"target_nilai"`
	TargetTingkatRisiko             string    `json:"target_tingkat_risiko"`
	MonitoringP                     *int      `json:"monitoring_p,omitempty"`
	MonitoringD                     *int      `json:"monitoring_d,omitempty"`
	MonitoringBobot                 *float64  `json:"monitoring_bobot,omitempty"`
	MonitoringNilai                 *float64  `json:"monitoring_nilai,omitempty"`
	MonitoringTingkatRisiko         string    `json:"monitoring_tingkat_risiko"`
	MonitoringSimpulanTingkatRisiko string    `json:"monitoring_simpulan_tingkat_risiko"`
	MonitoringEfektivitas           string    `json:"monitoring_efektivitas"`
	JadwalPelaksanaan               string    `json:"jadwal_pelaksanaan"`
}

// Validate performs domain validation on WorkingPaper
func (wp *WorkingPaper) Validate() error {
	if wp.Title == "" {
		return errors.ErrInvalidTitle
	}
	if len(wp.RiskSnapshots) == 0 {
		return &errors.AppError{
			Code:    "INVALID_RISK_SNAPSHOTS",
			Message: "at least one risk snapshot is required",
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

// ComputeHash computes a deterministic SHA-256 hash of the risk snapshots
func (wp *WorkingPaper) ComputeHash() string {
	// Marshal RiskSnapshots to JSON deterministically
	data, err := json.Marshal(wp.RiskSnapshots)
	if err != nil {
		return ""
	}

	// SHA-256 hash
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}
