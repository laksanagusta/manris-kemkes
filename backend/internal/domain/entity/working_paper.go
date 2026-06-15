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
	SequenceNo               int                    `json:"sequence_no"`
	Code                     string                 `json:"code"`
	Title                    string                 `json:"title"`
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
	TTESkipped               bool                   `json:"tte_skipped"`

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

type WorkingPaperRiskMonitoring struct {
	ID                          uuid.UUID  `json:"id"`
	Status                      string     `json:"status"`
	AssessmentCycle             string     `json:"assessmentCycle"`
	SourceProbability           int        `json:"sourceProbability"`
	SourceImpact                int        `json:"sourceImpact"`
	SourceWeight                float64    `json:"sourceWeight"`
	SourceNilai                 float64    `json:"sourceNilai"`
	SourceLevel                 string     `json:"sourceLevel"`
	ObservedProbability         int        `json:"observedProbability"`
	ObservedImpact              int        `json:"observedImpact"`
	ObservedWeight              float64    `json:"observedWeight"`
	ObservedNilai               float64    `json:"observedNilai"`
	ObservedLevel               string     `json:"observedLevel"`
	Trend                       string     `json:"trend"`
	MitigationCompletionPercent int        `json:"mitigationCompletionPercent"`
	MitigationProgressSummary   string     `json:"mitigationProgressSummary"`
	EffectivenessConclusion     string     `json:"effectivenessConclusion"`
	ConditionSummary            string     `json:"conditionSummary"`
	EventSummary                string     `json:"eventSummary"`
	MitigationObstacles         string     `json:"mitigationObstacles"`
	MitigationFollowUp          string     `json:"mitigationFollowUp"`
	FollowUpNote                string     `json:"followUpNote"`
	StartedAt                   time.Time  `json:"startedAt"`
	UpdatedAt                   time.Time  `json:"updatedAt"`
	FinalizedAt                 *time.Time `json:"finalizedAt,omitempty"`
}

type WorkingPaperSigningBlocker struct {
	VersionGroupID   uuid.UUID `json:"version_group_id"`
	Code             string    `json:"code"`
	Title            string    `json:"title"`
	MonitoringStatus string    `json:"monitoring_status"`
}

type WorkingPaperRiskData struct {
	ID                   uuid.UUID  `json:"id"`
	Code                 string     `json:"code"`
	Title                string     `json:"title"`
	Description          string     `json:"description"`
	Category             string     `json:"category"`
	Status               string     `json:"status"`
	OrgName              string     `json:"org_name"`
	Probability          int        `json:"probability"`
	Impact               int        `json:"impact"`
	Bobot                float64    `json:"bobot"`
	Nilai                float64    `json:"nilai"`
	InherentScore        int        `json:"inherentScore"`
	TingkatRisiko        string     `json:"tingkat_risiko"`
	PrioritasRisiko      int        `json:"prioritas_risiko"`
	Cause                []string   `json:"cause,omitempty"`
	RiskSource           string     `json:"risk_source,omitempty"`
	Controllability      string     `json:"controllability,omitempty"`
	ImpactDesc           []string   `json:"impact_desc,omitempty"`
	ExistingControl      string     `json:"existing_control,omitempty"`
	ControlEffectiveness string     `json:"control_effectiveness,omitempty"`
	RiskAppetite         string     `json:"risk_appetite,omitempty"`
	TreatmentOption      string     `json:"treatment_option,omitempty"`
	Mitigations          []string   `json:"mitigations,omitempty"`
	MitigationDueDates   []string   `json:"mitigation_due_dates,omitempty"`
	MitigationDetails    []string   `json:"mitigation_details,omitempty"`
	TargetProbability    int        `json:"target_probability,omitempty"`
	TargetImpact         int        `json:"target_impact,omitempty"`
	TargetBobot          float64    `json:"target_bobot,omitempty"`
	TargetNilai          float64    `json:"target_nilai,omitempty"`
	TargetScore          int        `json:"target_score,omitempty"`
	TargetTingkatRisiko  string     `json:"target_tingkat_risiko,omitempty"`
	AssessmentCycle      string     `json:"assessment_cycle,omitempty"`
	VersionNumber        int        `json:"versionNumber,omitempty"`
	PreviousRiskID       *uuid.UUID `json:"previousRiskId,omitempty"`

	// Human-readable display labels
	TingkatRisikoDisplay        string `json:"tingkat_risiko_display,omitempty"`
	TargetTingkatRisikoDisplay  string `json:"target_tingkat_risiko_display,omitempty"`
	RiskAppetiteDisplay         string `json:"risk_appetite_display,omitempty"`
	TreatmentOptionDisplay      string `json:"treatment_option_display,omitempty"`
	ControlEffectivenessDisplay string `json:"control_effectiveness_display,omitempty"`

	// Previous semester risk profile (for sheets 1 & 2)
	Previous *WorkingPaperRiskSnapshot `json:"previous,omitempty"`

	// Monitoring/realization data (for sheet 3)
	Monitoring                     *WorkingPaperRiskMonitoring `json:"monitoring,omitempty"`
	MonitoringP                    int                         `json:"monitoring_p,omitempty"`
	MonitoringD                    int                         `json:"monitoring_d,omitempty"`
	MonitoringBobot                float64                     `json:"monitoring_bobot,omitempty"`
	MonitoringNilai                float64                     `json:"monitoring_nilai,omitempty"`
	MonitoringInherentScore        int                         `json:"monitoring_inherent_score,omitempty"`
	MonitoringTingkatRisiko        string                      `json:"monitoring_tingkat_risiko,omitempty"`
	MonitoringTingkatRisikoDisplay string                      `json:"monitoring_tingkat_risiko_display,omitempty"`
	MonitoringSimpulan             string                      `json:"monitoring_simpulan,omitempty"`
	MonitoringEfektivitas          string                      `json:"monitoring_efektivitas,omitempty"`
	JadwalPelaksanaan              string                      `json:"jadwal_pelaksanaan,omitempty"`
	PenanggungJawab                string                      `json:"penanggung_jawab,omitempty"`
}

// WorkingPaperRiskSnapshot captures a previous-semester risk snapshot for export.
type WorkingPaperRiskSnapshot struct {
	Probability                 int      `json:"probability,omitempty"`
	Impact                      int      `json:"impact,omitempty"`
	Bobot                       float64  `json:"bobot,omitempty"`
	Nilai                       float64  `json:"nilai,omitempty"`
	InherentScore               int      `json:"inherentScore,omitempty"`
	TingkatRisiko               string   `json:"tingkat_risiko,omitempty"`
	TingkatRisikoDisplay        string   `json:"tingkat_risiko_display,omitempty"`
	PrioritasRisiko             int      `json:"prioritas_risiko,omitempty"`
	Cause                       []string `json:"cause,omitempty"`
	RiskSource                  string   `json:"risk_source,omitempty"`
	Controllability             string   `json:"controllability,omitempty"`
	ImpactDesc                  []string `json:"impact_desc,omitempty"`
	RiskAppetite                string   `json:"risk_appetite,omitempty"`
	RiskAppetiteDisplay         string   `json:"risk_appetite_display,omitempty"`
	TreatmentOption             string   `json:"treatment_option,omitempty"`
	TreatmentOptionDisplay      string   `json:"treatment_option_display,omitempty"`
	ExistingControl             string   `json:"existing_control,omitempty"`
	ControlEffectiveness        string   `json:"control_effectiveness,omitempty"`
	ControlEffectivenessDisplay string   `json:"control_effectiveness_display,omitempty"`
	TargetProbability           int      `json:"target_probability,omitempty"`
	TargetImpact                int      `json:"target_impact,omitempty"`
	TargetBobot                 float64  `json:"target_bobot,omitempty"`
	TargetNilai                 float64  `json:"target_nilai,omitempty"`
	TargetScore                 int      `json:"target_score,omitempty"`
	TargetTingkatRisiko         string   `json:"target_tingkat_risiko,omitempty"`
	TargetTingkatRisikoDisplay  string   `json:"target_tingkat_risiko_display,omitempty"`
	Mitigations                 []string `json:"mitigations,omitempty"`
	MitigationDueDates          []string `json:"mitigation_due_dates,omitempty"`
	MitigationDetails           []string `json:"mitigation_details,omitempty"`
}

func (r *WorkingPaperRiskData) NormalizeDerivedScores() {
	if r.Bobot == 0 && r.Probability > 0 && r.Impact > 0 {
		r.Bobot = GetBobot(r.Probability, r.Impact)
	}
	if r.Nilai == 0 && r.Bobot > 0 && r.Probability > 0 && r.Impact > 0 {
		r.Nilai = CalculateNilai(r.Probability, r.Impact, r.Bobot)
	}
	currentScore := r.Nilai
	if r.InherentScore > 0 {
		currentScore = float64(r.InherentScore)
	}
	r.TingkatRisiko = GetRiskLevelFromNilai(currentScore)
	r.PrioritasRisiko = GetRiskPriorityFromLevel(r.TingkatRisiko)

	if r.TargetBobot == 0 && r.TargetProbability > 0 && r.TargetImpact > 0 {
		r.TargetBobot = GetBobot(r.TargetProbability, r.TargetImpact)
	}
	if r.TargetNilai == 0 && r.TargetBobot > 0 && r.TargetProbability > 0 && r.TargetImpact > 0 {
		r.TargetNilai = CalculateNilai(r.TargetProbability, r.TargetImpact, r.TargetBobot)
	}
	targetScore := r.TargetNilai
	if r.TargetScore > 0 {
		targetScore = float64(r.TargetScore)
	}
	if targetScore > 0 {
		r.TargetTingkatRisiko = GetRiskLevelFromNilai(targetScore)
	}

	// Set display labels
	r.TingkatRisikoDisplay = GetRiskLevelDisplay(r.TingkatRisiko)
	r.TargetTingkatRisikoDisplay = GetRiskLevelDisplay(r.TargetTingkatRisiko)
	r.RiskAppetiteDisplay = GetRiskAppetiteDisplay(r.RiskAppetite)
	r.TreatmentOptionDisplay = GetTreatmentOptionDisplay(r.TreatmentOption)
	r.ControlEffectivenessDisplay = GetControlEffectivenessDisplay(r.ControlEffectiveness)

	monScore := r.MonitoringNilai
	if r.MonitoringInherentScore > 0 {
		monScore = float64(r.MonitoringInherentScore)
	}
	if monScore > 0 {
		r.MonitoringTingkatRisiko = GetRiskLevelFromNilai(monScore)
		r.MonitoringTingkatRisikoDisplay = GetRiskLevelDisplay(r.MonitoringTingkatRisiko)
	}

	if r.Previous != nil {
		r.Previous.Normalize()
	}
}

// PreviousNilai returns the previous semester baseline score (nilai or inherent_score).
func (r *WorkingPaperRiskData) PreviousNilai() float64 {
	if r.Previous == nil {
		return 0
	}
	if r.Previous.InherentScore > 0 {
		return float64(r.Previous.InherentScore)
	}
	return r.Previous.Nilai
}

// Normalize computes derived scores and display labels for a snapshot.
func (s *WorkingPaperRiskSnapshot) Normalize() {
	if s.Bobot == 0 && s.Probability > 0 && s.Impact > 0 {
		s.Bobot = GetBobot(s.Probability, s.Impact)
	}
	if s.Nilai == 0 && s.Bobot > 0 && s.Probability > 0 && s.Impact > 0 {
		s.Nilai = CalculateNilai(s.Probability, s.Impact, s.Bobot)
	}
	score := s.Nilai
	if s.InherentScore > 0 {
		score = float64(s.InherentScore)
	}
	if score > 0 {
		s.TingkatRisiko = GetRiskLevelFromNilai(score)
		s.TingkatRisikoDisplay = GetRiskLevelDisplay(s.TingkatRisiko)
	}
	s.PrioritasRisiko = GetRiskPriorityFromLevel(s.TingkatRisiko)

	if s.TargetBobot == 0 && s.TargetProbability > 0 && s.TargetImpact > 0 {
		s.TargetBobot = GetBobot(s.TargetProbability, s.TargetImpact)
	}
	if s.TargetNilai == 0 && s.TargetBobot > 0 && s.TargetProbability > 0 && s.TargetImpact > 0 {
		s.TargetNilai = CalculateNilai(s.TargetProbability, s.TargetImpact, s.TargetBobot)
	}
	targetScore := s.TargetNilai
	if s.TargetScore > 0 {
		targetScore = float64(s.TargetScore)
	}
	if targetScore > 0 {
		s.TargetTingkatRisiko = GetRiskLevelFromNilai(targetScore)
		s.TargetTingkatRisikoDisplay = GetRiskLevelDisplay(s.TargetTingkatRisiko)
	}

	s.RiskAppetiteDisplay = GetRiskAppetiteDisplay(s.RiskAppetite)
	s.TreatmentOptionDisplay = GetTreatmentOptionDisplay(s.TreatmentOption)
	s.ControlEffectivenessDisplay = GetControlEffectivenessDisplay(s.ControlEffectiveness)
}

// WorkingPaperSignatory represents a signer in the workflow
type WorkingPaperSignatory struct {
	ID             uuid.UUID       `json:"id"`
	WorkingPaperID uuid.UUID       `json:"working_paper_id"`
	UserID         uuid.UUID       `json:"user_id"`
	SequenceNo     int             `json:"sequence_no"` // 1-based sequence order
	SignerName     string          `json:"signer_name"`
	SignerNIP      string          `json:"signer_nip"`
	SignerJabatan  string          `json:"signer_jabatan"`
	SignerPangkat  string          `json:"signer_pangkat"`
	Status         string          `json:"status"` // pending, signed
	SignedAt       *time.Time      `json:"signed_at,omitempty"`
	QRCodePNG      string          `json:"qr_code_png,omitempty"` // base64 PNG
	QRData         json.RawMessage `json:"qr_data,omitempty"`     // JSON with signing metadata
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
	if wp.Status != WorkingPaperStatusSigning {
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

// StartSigning marks a draft working paper as ready for signatures.
func (wp *WorkingPaper) StartSigning() error {
	if wp.Status != WorkingPaperStatusDraft {
		return &errors.AppError{
			Code:    "INVALID_STATUS",
			Message: "only draft working papers can start signing",
		}
	}

	wp.Status = WorkingPaperStatusSigning
	wp.UpdatedAt = time.Now()
	return nil
}

// SkipTTE marks the working paper as completed without TTE.
// All signatories remain pending (no QR codes, no signed_at).
func (wp *WorkingPaper) SkipTTE() {
	now := time.Now()
	wp.TTESkipped = true
	wp.Status = WorkingPaperStatusCompleted
	wp.CompletedAt = &now
	wp.UpdatedAt = now
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
