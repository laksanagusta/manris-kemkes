package entity

import (
	"testing"
)

func TestLikelihoodAssessmentValidate(t *testing.T) {
	tests := []struct {
		name       string
		assessment LikelihoodAssessment
		wantErr    bool
	}{
		{
			name: "valid frequency assessment",
			assessment: LikelihoodAssessment{
				Method:                   "frequency",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				EventCount:               ptrInt(7),
				SelectedProbabilityLevel: 3,
				Justification:            "Dari 7 kejadian dalam 12 bulan",
			},
			wantErr: false,
		},
		{
			name: "invalid method",
			assessment: LikelihoodAssessment{
				Method:                   "foo",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				SelectedProbabilityLevel: 3,
			},
			wantErr: true,
		},
		{
			name: "invalid frequency type",
			assessment: LikelihoodAssessment{
				Method:                   "frequency",
				FrequencyType:            "unknown",
				ObservationPeriodMonths:  12,
				SelectedProbabilityLevel: 3,
			},
			wantErr: true,
		},
		{
			name: "expert judgement without justification",
			assessment: LikelihoodAssessment{
				Method:                   "expert_judgement",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				SelectedProbabilityLevel: 3,
				Justification:            "",
			},
			wantErr: true,
		},
		{
			name: "benchmarking without justification",
			assessment: LikelihoodAssessment{
				Method:                   "benchmarking",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				SelectedProbabilityLevel: 3,
				Justification:            "",
			},
			wantErr: true,
		},
		{
			name: "consensus without justification",
			assessment: LikelihoodAssessment{
				Method:                   "consensus",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				SelectedProbabilityLevel: 3,
				Justification:            "",
			},
			wantErr: true,
		},
		{
			name: "probability method without population",
			assessment: LikelihoodAssessment{
				Method:                   "probability",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				EventCount:               ptrInt(5),
				SelectedProbabilityLevel: 2,
				Justification:            "test",
			},
			wantErr: true,
		},
		{
			name: "probability method with population",
			assessment: LikelihoodAssessment{
				Method:                   "probability",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				EventCount:               ptrInt(5),
				PopulationCount:          ptrInt(100),
				SelectedProbabilityLevel: 2,
				Justification:            "test",
			},
			wantErr: false,
		},
		{
			name: "selected level out of range",
			assessment: LikelihoodAssessment{
				Method:                   "frequency",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				EventCount:               ptrInt(1),
				SelectedProbabilityLevel: 6,
			},
			wantErr: true,
		},
		{
			name: "selected level zero",
			assessment: LikelihoodAssessment{
				Method:                   "frequency",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				EventCount:               ptrInt(1),
				SelectedProbabilityLevel: 0,
			},
			wantErr: true,
		},
		{
			name: "negative observation period",
			assessment: LikelihoodAssessment{
				Method:                   "frequency",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  0,
				EventCount:               ptrInt(1),
				SelectedProbabilityLevel: 3,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.assessment.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestResolveLikelihoodLevel(t *testing.T) {
	tests := []struct {
		name            string
		method          string
		frequencyType  string
		eventCount     int
		populationCount int
		observationMo  int
		wantLevel      int
	}{
		// Non-low frequency thresholds per KMK table (observation: 12 bulan)
		{"non-low: 0 events → level 1 (Jarang)", "frequency", "non_low_frequency", 0, 0, 12, 1},
		{"non-low: 1 event → level 1 (Jarang)", "frequency", "non_low_frequency", 1, 0, 12, 1},
		{"non-low: 2 events → level 2 (Kemungkinan Kecil)", "frequency", "non_low_frequency", 2, 0, 12, 2},
		{"non-low: 5 events → level 2 (Kemungkinan Kecil)", "frequency", "non_low_frequency", 5, 0, 12, 2},
		{"non-low: 6 events → level 3 (Kemungkinan Sedang)", "frequency", "non_low_frequency", 6, 0, 12, 3},
		{"non-low: 9 events → level 3 (Kemungkinan Sedang)", "frequency", "non_low_frequency", 9, 0, 12, 3},
		{"non-low: 10 events → level 4 (Kemungkinan Besar)", "frequency", "non_low_frequency", 10, 0, 12, 4},
		{"non-low: 12 events → level 4 (Kemungkinan Besar)", "frequency", "non_low_frequency", 12, 0, 12, 4},
		{"non-low: 13 events → level 5 (Hampir Pasti Terjadi)", "frequency", "non_low_frequency", 13, 0, 12, 5},
		{"non-low: 100 events → level 5 (Hampir Pasti Terjadi)", "frequency", "non_low_frequency", 100, 0, 12, 5},

		// Low frequency thresholds per KMK table (observation: 60 bulan)
		{"low: 0 events → level 1 (Jarang)", "frequency", "low_frequency", 0, 0, 60, 1},
		{"low: 1 event in 60mo → level 2 (Kemungkinan Kecil)", "frequency", "low_frequency", 1, 0, 60, 2},
		{"low: annualRate 0.33 (2 in 60mo) → level 3 (Kemungkinan Sedang)", "frequency", "low_frequency", 2, 0, 60, 3},
		{"low: annualRate 0.5 (3 in 60mo) → level 4 (Kemungkinan Besar)", "frequency", "low_frequency", 3, 0, 60, 4},
		{"low: annualRate 1.0 (5 in 60mo) → level 5 (Hampir Pasti Terjadi)", "frequency", "low_frequency", 5, 0, 60, 5},

		// Probability method: P = eventCount/populationCount × 100, scaled by observation period
		{"prob: P ≤ 1% → level 1 (Jarang)", "probability", "non_low_frequency", 1, 100, 12, 1},
		{"prob: 1% < P ≤ 10% → level 2 (Kemungkinan Kecil)", "probability", "non_low_frequency", 5, 100, 12, 2},
		{"prob: 10% < P ≤ 20% → level 3 (Kemungkinan Sedang)", "probability", "non_low_frequency", 15, 100, 12, 3},
		{"prob: 20% < P ≤ 50% → level 4 (Kemungkinan Besar)", "probability", "non_low_frequency", 35, 100, 12, 4},
		{"prob: P > 50% → level 5 (Hampir Pasti Terjadi)", "probability", "non_low_frequency", 60, 100, 12, 5},

		// Non-data methods default to 3
		{"expert_judgement → level 3 (default, needs UPR judgement)", "expert_judgement", "", 0, 0, 0, 3},
		{"benchmarking → level 3 (default)", "benchmarking", "", 0, 0, 0, 3},
		{"consensus → level 3 (default)", "consensus", "", 0, 0, 0, 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ResolveLikelihoodLevel(tt.method, tt.frequencyType, tt.eventCount, tt.populationCount, tt.observationMo)
			if got != tt.wantLevel {
				t.Errorf("ResolveLikelihoodLevel(%q, %q, %d, %d, %d) = %v, want %v",
					tt.method, tt.frequencyType, tt.eventCount, tt.populationCount, tt.observationMo, got, tt.wantLevel)
			}
		})
	}
}

// ptrInt is a helper to create *int from int literal.
func ptrInt(v int) *int {
	return &v
}
