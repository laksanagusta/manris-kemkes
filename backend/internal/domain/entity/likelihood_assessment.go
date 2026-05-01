package entity

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

type LikelihoodAssessment struct {
	ID                       uuid.UUID `json:"id"`
	RiskID                   uuid.UUID `json:"riskId"`
	Method                   string    `json:"method"`
	FrequencyType            string    `json:"frequencyType"`
	ObservationPeriodMonths  int       `json:"observationPeriodMonths"`
	EventCount               *int      `json:"eventCount,omitempty"`
	PopulationCount          *int      `json:"populationCount,omitempty"`
	CalculatedProbability    *float64  `json:"calculatedProbability,omitempty"`
	SelectedProbabilityLevel int       `json:"selectedProbabilityLevel"`
	Justification            string    `json:"justification"`
	DataSource               string    `json:"dataSource"`
	CreatedAt                time.Time `json:"createdAt"`
	UpdatedAt                time.Time `json:"updatedAt"`
}

func (l LikelihoodAssessment) Validate() error {
	switch l.Method {
	case "frequency", "probability", "expert_judgement", "benchmarking", "consensus":
	default:
		return fmt.Errorf("invalid method: %s", l.Method)
	}
	switch l.FrequencyType {
	case "low_frequency", "non_low_frequency":
	default:
		return fmt.Errorf("invalid frequency type: %s", l.FrequencyType)
	}
	if l.ObservationPeriodMonths <= 0 {
		return fmt.Errorf("observation period must be positive")
	}
	if l.SelectedProbabilityLevel < 1 || l.SelectedProbabilityLevel > 5 {
		return fmt.Errorf("selected probability level must be between 1 and 5")
	}
	if l.Method == "probability" && l.PopulationCount == nil {
		return fmt.Errorf("probability method requires population count")
	}
	if (l.Method == "expert_judgement" || l.Method == "benchmarking" || l.Method == "consensus") && l.Justification == "" {
		return fmt.Errorf("justification is required for method %s", l.Method)
	}
	return nil
}

// ResolveLikelihoodLevel returns the recommended probability level based on
// KMK threshold tables (kmk.md Tabel 1: Kriteria Level Kemungkinan).
// method: "frequency" | "probability" | "expert_judgement" | "benchmarking" | "consensus"
// frequencyType: "low_frequency" | "non_low_frequency" (ignored for non-data methods)
// eventCount: number of events observed
// populationCount: total population (only used for probability method)
// observationMonths: observation period in months
func ResolveLikelihoodLevel(method string, frequencyType string, eventCount int, populationCount int, observationMonths int) int {
	switch method {
	case "frequency", "probability":
		if observationMonths <= 0 {
			return 3 // default to middle if no data
		}

		if method == "probability" && populationCount > 0 {
			// Probability: P = events per population per year × 100
			// Scale by observation period to get annualized probability percentage
			P := float64(eventCount) * 100.0 / float64(populationCount) * 12.0 / float64(observationMonths)
			switch {
			case P <= 1:
				return 1 // Jarang: P ≤ 1%
			case P <= 10:
				return 2 // Kemungkinan Kecil: 1% < P ≤ 10%
			case P <= 20:
				return 3 // Kemungkinan Sedang: 10% < P ≤ 20%
			case P <= 50:
				return 4 // Kemungkinan Besar: 20% < P ≤ 50%
			default:
				return 5 // Hampir Pasti Terjadi: P > 50%
			}
		}

		// Frequency: count events per observation period
		if frequencyType == "low_frequency" {
			// Low frequency: observation period is 60 months
			// Per KMK table thresholds:
			// Level 1: ≤ 1 kejadian dalam 60 bulan
			// Level 2: ≥ 1 dalam 60 bulan (but < threshold for level 3)
			// Level 3: ≥ 1 dalam 36 bulan (annualRate ≥ 0.33)
			// Level 4: ≥ 1 dalam 24 bulan (annualRate ≥ 0.5)
			// Level 5: ≥ 1 dalam 12 bulan (annualRate ≥ 1.0)
			annualRate := float64(eventCount) * 12.0 / float64(observationMonths)
			switch {
			case eventCount == 0:
				return 1 // ≤ 1 dalam 60 bulan
			case annualRate >= 1.0:
				return 5 // Hampir Pasti Terjadi
			case annualRate >= 0.5:
				return 4 // Kemungkinan Besar
			case annualRate >= 0.33:
				return 3 // Kemungkinan Sedang
			default:
				return 2 // Kemungkinan Kecil
			}
		}

		// Non-low frequency: per KMK table, count events in 12 months
		// Level 1: < 2 dalam 12 bulan (Jarang)
		// Level 2: 2-5 dalam 12 bulan (Kemungkinan Kecil)
		// Level 3: 6-9 dalam 12 bulan (Kemungkinan Sedang)
		// Level 4: 10-12 dalam 12 bulan (Kemungkinan Besar)
		// Level 5: > 12 dalam 12 bulan (Hampir Pasti Terjadi)
		switch {
		case eventCount < 2:
			return 1 // Jarang
		case eventCount <= 5:
			return 2 // Kemungkinan Kecil
		case eventCount <= 9:
			return 3 // Kemungkinan Sedang
		case eventCount <= 12:
			return 4 // Kemungkinan Besar
		default:
			return 5 // Hampir Pasti Terjadi
		}
	}

	// For non-data methods (expert_judgement, benchmarking, consensus),
	// default to 3 — UPR judgment is required to determine the level
	return 3
}
