package entity

import (
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// RiskLevel constants for Indonesian risk levels
const (
	RiskLevelSangatRendah = "sangat_rendah"
	RiskLevelRendah       = "rendah"
	RiskLevelSedang       = "sedang"
	RiskLevelTinggi       = "tinggi"
	RiskLevelSangatTinggi = "sangat_tinggi"
)

// RiskStatus constants for risk workflow states
const (
	RiskStatusDraft    = "assessment_draft"
	RiskStatusInReview = "assessment_in_review"
	RiskStatusApproved = "approved"
)

// BobotMatrix is the 5x5 weight matrix based on Probability (rows) and Impact (columns)
// Rows: Probability 1-5 (Jarang to Hampir Pasti Terjadi)
// Cols: Impact 1-5 (Tdk Signifikan to Katastropik)
var BobotMatrix = [5][5]float64{
	// Impact: 1(Tdk Signifikan), 2(Kecil), 3(Sedang), 4(Besar), 5(Katastropik)
	{1.0, 1.5, 2.0, 3.0, 4.0},      // Prob 1: Jarang
	{1.0, 1.8, 1.83, 1.9, 2.1},     // Prob 2: Kemungkinan Kecil
	{1.17, 1.42, 1.43, 1.46, 1.47}, // Prob 3: Kemungkinan Sedang
	{1.2, 1.19, 1.3, 1.16, 1.2},    // Prob 4: Kemungkinan Besar
	{1.5, 1.4, 1.13, 1.15, 1.0},    // Prob 5: Hampir Pasti Terjadi
}

// Risk represents a risk register entry
type Risk struct {
	ID                     uuid.UUID  `json:"id"`
	Code                   string     `json:"code"`
	Title                  string     `json:"title"`
	Description            string     `json:"description"`
	Category               string     `json:"category"`
	Status                 string     `json:"status"`
	VersionGroupID         uuid.UUID  `json:"versionGroupId"`
	PreviousRiskID         *uuid.UUID `json:"previousRiskId,omitempty"`
	IsCurrent              bool       `json:"isCurrent"`
	IsCycleCurrent         bool       `json:"isCycleCurrent"`
	VersionNumber          int        `json:"versionNumber"`
	ArchivedAt             *time.Time `json:"archivedAt,omitempty"`
	ArchivedReason         string     `json:"archivedReason,omitempty"`
	OrganizationID         *uuid.UUID `json:"organizationId,omitempty"`
	OrgName                string     `json:"orgName"`
	CreatedBy              *uuid.UUID `json:"createdBy,omitempty"`
	CreatedByName          string     `json:"createdByName"`
	RiskOwnerID            *uuid.UUID `json:"riskOwnerId,omitempty"`
	ControlOwnerID         *uuid.UUID `json:"controlOwnerId,omitempty"`
	ObjectiveID            *uuid.UUID `json:"objectiveId,omitempty"`
	ROID                   *uuid.UUID `json:"roId,omitempty"`
	LikelihoodAssessmentID *uuid.UUID `json:"likelihoodAssessmentId,omitempty"`
	ImpactCriteriaID       *uuid.UUID `json:"impactCriteriaId,omitempty"`
	ImpactJustification    string     `json:"impactJustification,omitempty"`

	// Section 1
	Cause           []string `json:"cause,omitempty"`
	RiskSource      string   `json:"riskSource,omitempty"`
	Controllability string   `json:"controllability,omitempty"`
	ImpactDesc      []string `json:"impactDesc,omitempty"`

	// Section 2
	ExistingControl      string  `json:"existingControl,omitempty"`
	ControlEffectiveness string  `json:"controlEffectiveness,omitempty"`
	Probability          int     `json:"probability"`
	Impact               int     `json:"impact"`
	Weight               float64 `json:"weight,omitempty"`
	Nilai                float64 `json:"nilai,omitempty"` // Nilai = Probability × Impact × Weight
	InherentScore        int     `json:"inherentScore"`

	// Section 3
	RiskPriority    int    `json:"riskPriority,omitempty"`
	RiskAppetite    string `json:"riskAppetite,omitempty"`
	TreatmentOption string `json:"treatmentOption,omitempty"`

	// Section 4
	Mitigations []Mitigation `json:"mitigations,omitempty"`

	// Section 5
	TargetProbability        int                  `json:"targetProbability,omitempty"`
	TargetImpact             int                  `json:"targetImpact,omitempty"`
	TargetWeight             float64              `json:"targetWeight,omitempty"`
	TargetNilai              float64              `json:"targetNilai,omitempty"`
	TargetScore              int                  `json:"targetScore,omitempty"`
	ResidualAcceptanceReason string               `json:"residualAcceptanceReason,omitempty"`
	NextReviewDate           *string              `json:"nextReviewDate,omitempty"`
	ReviewScheduleText       string               `json:"reviewScheduleText,omitempty"`
	AssessmentCycle          string               `json:"assessmentCycle,omitempty"`
	ReviewType               string               `json:"reviewType,omitempty"`
	ChangeReason             string               `json:"changeReason,omitempty"`
	ReviewSummary            string               `json:"reviewSummary,omitempty"`
	ReviewStartedAt          *time.Time           `json:"reviewStartedAt,omitempty"`
	ReviewSubmittedAt        *time.Time           `json:"reviewSubmittedAt,omitempty"`
	ReviewApprovedAt         *time.Time           `json:"reviewApprovedAt,omitempty"`
	DraftApprovalLine        []ApprovalLineMember `json:"draftApprovalLine,omitempty"`

	// Ongoing draft tracking (for list views)
	DraftID               *uuid.UUID                `json:"draftId,omitempty"`
	DraftStatus           *string                   `json:"draftStatus,omitempty"`
	HasOngoing            bool                      `json:"hasOngoing"`
	MonitoringStatus      *string                   `json:"monitoringStatus,omitempty"`
	LastMonitoredAt       *time.Time                `json:"lastMonitoredAt,omitempty"`
	BeforeMonitoringNilai *float64                  `json:"beforeMonitoringNilai,omitempty"`
	MonitoringResultNilai *float64                  `json:"monitoringResultNilai,omitempty"`
	SemesterMonitoring    *SemesterMonitoringStatus `json:"semesterMonitoring,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type SemesterMonitoringStatus struct {
	H1 *string `json:"h1"`
	H2 *string `json:"h2"`
}

type ApprovalLineMember struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type,omitempty"` // 'review' or 'approval' - distinguishes reviewer from approver
}

const (
	RiskCategoryKebijakan   = "kebijakan"
	RiskCategoryOperasional = "operasional"
	RiskCategoryKepatuhan   = "kepatuhan"
	RiskCategoryFraud       = "fraud_korupsi"
	RiskCategoryReputasi    = "reputasi"
	RiskCategoryLegal       = "legal"
)

var allowedRiskCategories = map[string]struct{}{
	"":                      {},
	RiskCategoryKebijakan:   {},
	RiskCategoryOperasional: {},
	RiskCategoryKepatuhan:   {},
	RiskCategoryFraud:       {},
	RiskCategoryReputasi:    {},
	RiskCategoryLegal:       {},
}

func IsValidRiskCategory(category string) bool {
	_, ok := allowedRiskCategories[category]
	return ok
}

// Validate performs domain validation on Risk
func (r *Risk) Validate() error {
	if r.Title == "" {
		return errors.ErrInvalidTitle
	}
	if r.Code == "" {
		return errors.ErrInvalidCode
	}
	if r.Status == "" {
		return errors.ErrInvalidStatus
	}
	if !IsValidRiskCategory(r.Category) {
		return errors.ErrInvalidRiskCategory
	}
	if r.Probability < 1 || r.Probability > 5 {
		return errors.ErrInvalidProbability
	}
	if r.Impact < 1 || r.Impact > 5 {
		return errors.ErrInvalidImpact
	}
	for i := range r.Mitigations {
		if err := r.Mitigations[i].Validate(); err != nil {
			return err
		}
	}
	return nil
}

// CanBeSubmittedForApproval checks if risk can be submitted for approval
func (r *Risk) CanBeSubmittedForApproval() bool {
	return r.Status == RiskStatusDraft
}

// GetBobot returns the weight from the matrix based on probability and impact
func GetBobot(probability, impact int) float64 {
	if probability < 1 || probability > 5 || impact < 1 || impact > 5 {
		return 1.0
	}
	return BobotMatrix[probability-1][impact-1]
}

// CalculateNilai calculates nilai = probability × impact × weight
func CalculateNilai(probability, impact int, weight float64) float64 {
	raw := float64(probability) * float64(impact) * weight
	return math.Round(raw*100) / 100
}

// GetInherentScore calculates inherent score
func (r *Risk) GetInherentScore() int {
	return int(math.Round(float64(r.Probability) * float64(r.Impact) * r.Weight))
}

// CalculateInherentScore calculates and sets the inherent score
func (r *Risk) CalculateInherentScore() {
	r.InherentScore = int(math.Round(float64(r.Probability) * float64(r.Impact) * r.Weight))
}

// CalculateTargetScore calculates and sets the target score
func (r *Risk) CalculateTargetScore() {
	r.TargetScore = int(math.Round(float64(r.TargetProbability) * float64(r.TargetImpact) * r.TargetWeight))
}

// CalculateBobot calculates and sets the weight based on probability and impact
func (r *Risk) CalculateBobot() {
	r.Weight = GetBobot(r.Probability, r.Impact)
}

// CalculateNilai calculates and sets the nilai field
func (r *Risk) CalculateNilai() {
	r.Nilai = CalculateNilai(r.Probability, r.Impact, r.Weight)
}

// CalculateTargetBobot calculates and sets the target weight based on target probability and impact
func (r *Risk) CalculateTargetBobot() {
	r.TargetWeight = GetBobot(r.TargetProbability, r.TargetImpact)
}

// CalculateTargetNilai calculates and sets the target nilai field
func (r *Risk) CalculateTargetNilai() {
	r.TargetNilai = CalculateNilai(r.TargetProbability, r.TargetImpact, r.TargetWeight)
}

// GetRiskLevel returns Indonesian risk level based on nilai
// Sangat Rendah: nilai < 5, Rendah: 5-9, Sedang: 10-14, Tinggi: 15-19, Sangat Tinggi: >= 20
func (r *Risk) GetRiskLevel() string {
	return GetRiskLevelFromNilai(r.EffectiveNilai())
}

// GetRiskLevelFromNilai returns Indonesian risk level based on nilai value
func GetRiskLevelFromNilai(nilai float64) string {
	rounded := math.Round(nilai)
	switch {
	case rounded >= 20:
		return RiskLevelSangatTinggi
	case rounded >= 15:
		return RiskLevelTinggi
	case rounded >= 10:
		return RiskLevelSedang
	case rounded >= 5:
		return RiskLevelRendah
	default:
		return RiskLevelSangatRendah
	}
}

// GetRiskPriority returns priority based on risk level
// Sangat Tinggi = 1, Tinggi = 2, Sedang = 3, Rendah = 4, Sangat Rendah = 5
func (r *Risk) GetRiskPriority() int {
	return GetRiskPriorityFromLevel(r.GetRiskLevel())
}

// GetRiskPriorityFromLevel returns priority number based on risk level string
func GetRiskPriorityFromLevel(level string) int {
	switch level {
	case RiskLevelSangatTinggi:
		return 1
	case RiskLevelTinggi:
		return 2
	case RiskLevelSedang:
		return 3
	case RiskLevelRendah:
		return 4
	case RiskLevelSangatRendah:
		return 5
	default:
		return 5
	}
}

// GetRiskLevelDisplay returns the Indonesian display name for risk level
func GetRiskLevelDisplay(level string) string {
	switch level {
	case RiskLevelSangatTinggi:
		return "Sangat Tinggi"
	case RiskLevelTinggi:
		return "Tinggi"
	case RiskLevelSedang:
		return "Sedang"
	case RiskLevelRendah:
		return "Rendah"
	case RiskLevelSangatRendah:
		return "Sangat Rendah"
	default:
		return level
	}
}

// ResolveRiskAppetite returns advisory appetite status based on inherentScore.
// Per KMK risk appetite matrix: inherentScore < 10 → dalam_batas, >= 10 → di_atas_batas.
func ResolveRiskAppetite(inherentScore int) string {
	if inherentScore < 10 {
		return "dalam_batas"
	}
	return "di_atas_batas"
}

// IsRiskUtama returns true if risk level is Sedang or higher.
// Per KMK: inherentScore >= 10 corresponds to Sedang/Tinggi/SangatTinggi level.
func (r Risk) IsRiskUtama() bool {
	return r.InherentScore >= 10
}

// GetRiskAppetiteDisplay returns the Indonesian display name for risk appetite
func GetRiskAppetiteDisplay(appetite string) string {
	switch appetite {
	case "dalam_batas":
		return "Dalam batas selera risiko"
	case "di_atas_batas":
		return "Di atas batas selera risiko"
	default:
		return appetite
	}
}

// GetTreatmentOptionDisplay returns the Indonesian display name for treatment option
func GetTreatmentOptionDisplay(option string) string {
	switch option {
	case "avoid", "menghindari":
		return "Menghindari Risiko"
	case "transfer", "berbagi":
		return "Berbagi Risiko"
	case "mitigate", "mitigasi":
		return "Mitigasi"
	case "accept", "menerima":
		return "Menerima Risiko"
	default:
		return option
	}
}

// GetControlEffectivenessDisplay returns the Indonesian display name for control effectiveness
func GetControlEffectivenessDisplay(eff string) string {
	switch eff {
	case "efektif":
		return "Efektif"
	case "tidak_efektif":
		return "Tidak Efektif"
	default:
		return eff
	}
}

// GetControllabilityDisplay returns the Indonesian display name for controllability
func GetControllabilityDisplay(c string) string {
	switch c {
	case "C":
		return "Controllable"
	case "UC":
		return "Uncontrollable"
	default:
		return c
	}
}

// GetRiskSourceDisplay returns the Indonesian display name for risk source
func GetRiskSourceDisplay(s string) string {
	switch s {
	case "internal":
		return "Internal"
	case "eksternal":
		return "Eksternal"
	default:
		return s
	}
}

// CalculateAll computes bobot, nilai, inherent score, and updates risk priority
func (r *Risk) CalculateAll() {
	r.CalculateBobot()
	r.CalculateNilai()
	r.CalculateInherentScore()
	r.RiskPriority = r.GetRiskPriority()
}

// IsLocked checks if risk is in a locked (non-editable) status
func (r *Risk) IsLocked() bool {
	return r.Status == RiskStatusInReview || r.Status == RiskStatusApproved
}

// IsApprovedCurrent returns whether this risk is the active approved version.
func (r *Risk) IsApprovedCurrent() bool {
	return r.Status == RiskStatusApproved && r.IsCurrent
}

// CanBeReassessed returns whether the risk can start a periodic reassessment.
func (r *Risk) CanBeReassessed() bool {
	return r.IsApprovedCurrent()
}

// AddMitigation adds a mitigation to the risk
func (r *Risk) AddMitigation(mitigation Mitigation) {
	r.Mitigations = append(r.Mitigations, mitigation)
}

func (r *Risk) effectivePreliminaryScore() int {
	if r.InherentScore > 0 {
		return r.InherentScore
	}
	if r.Nilai > 0 {
		return int(math.Round(r.Nilai))
	}
	weight := r.Weight
	if weight == 0 {
		weight = GetBobot(r.Probability, r.Impact)
	}
	return int(math.Round(float64(r.Probability) * float64(r.Impact) * weight))
}

func (r *Risk) EffectiveProbability() int {
	return r.Probability
}

func (r *Risk) EffectiveImpact() int {
	return r.Impact
}

func (r *Risk) EffectiveNilai() float64 {
	return r.Nilai
}

func (r *Risk) GetEffectiveScore() int {
	return r.effectivePreliminaryScore()
}
