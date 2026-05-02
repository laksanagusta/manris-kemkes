package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type TMPMRStatus string

const (
	TMPMRStatusDraft     TMPMRStatus = "draft"
	TMPMRStatusSubmitted TMPMRStatus = "submitted"
	TMPMRStatusReviewed  TMPMRStatus = "reviewed"
	TMPMRStatusApproved  TMPMRStatus = "approved"
)

type TMPMRItem struct {
	ID           uuid.UUID `json:"id"`
	AssessmentID uuid.UUID `json:"assessmentId"`
	Dimension    string    `json:"dimension"`
	Question     string    `json:"question"`
	Score        int       `json:"score"`
	EvidenceURL  string    `json:"evidenceUrl"`
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type TMPMRAssessment struct {
	ID             uuid.UUID   `json:"id"`
	OrganizationID uuid.UUID   `json:"organizationId"`
	Period         string      `json:"period"`
	AssessorID     *uuid.UUID  `json:"assessorId,omitempty"`
	ReviewerID     *uuid.UUID  `json:"reviewerId,omitempty"`
	Status         TMPMRStatus `json:"status"`
	Score          float64     `json:"score"`
	MaturityLevel  string      `json:"maturityLevel"`
	ReviewNote     string      `json:"reviewNote"`
	Items          []TMPMRItem `json:"items"`
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`
}

func DefaultTMPMRItems() []TMPMRItem {
	return []TMPMRItem{
		{
			Dimension: "governance",
			Question:  "Tata kelola manajemen risiko telah ditetapkan dan dijalankan.",
		},
		{
			Dimension: "context_criteria",
			Question:  "Konteks, cakupan, dan kriteria risiko telah terdokumentasi.",
		},
		{
			Dimension: "risk_assessment",
			Question:  "Identifikasi, analisis, dan evaluasi risiko dilakukan berbasis sasaran.",
		},
		{
			Dimension: "risk_treatment",
			Question:  "Perlakuan risiko disusun, dipantau, dan memiliki penanggung jawab.",
		},
		{
			Dimension: "monitoring_review",
			Question:  "Pemantauan dan reviu risiko dilakukan secara berkala.",
		},
		{
			Dimension: "recording_reporting",
			Question:  "Pencatatan dan pelaporan risiko tersedia sebagai bukti audit.",
		},
	}
}

func TMPMRMaturityLevel(score float64) string {
	switch {
	case score < 1.50:
		return "Awal"
	case score < 2.50:
		return "Berkembang"
	case score < 3.50:
		return "Terdefinisi"
	case score < 4.50:
		return "Terkelola"
	default:
		return "Optimum"
	}
}

func CalculateTMPMRScore(items []TMPMRItem) (float64, string) {
	if len(items) == 0 {
		return 0, "Awal"
	}

	total := 0
	for _, item := range items {
		total += item.Score
	}

	score := float64(total) / float64(len(items))
	return score, TMPMRMaturityLevel(score)
}

func (a TMPMRAssessment) Validate() error {
	if a.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(a.Period) == "" {
		return fmt.Errorf("period is required")
	}

	switch a.Status {
	case "", TMPMRStatusDraft, TMPMRStatusSubmitted, TMPMRStatusReviewed, TMPMRStatusApproved:
	default:
		return fmt.Errorf("invalid tmpmr status")
	}

	return nil
}
