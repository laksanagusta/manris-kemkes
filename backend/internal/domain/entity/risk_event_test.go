package entity

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func validRiskEvent() RiskEvent {
	return RiskEvent{
		Description: "Sistem pelaporan tidak dapat diakses",
		OccurredAt:  time.Now(), ImpactTypes: []string{"service"},
		Severity:              RiskEventSeverityHigh,
		PostResponseCondition: "controlled", OrganizationID: uuid.New(), CreatedBy: uuid.New(),
	}
}

func TestRiskEventValidate(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(*RiskEvent)
		wantErr bool
	}{
		{name: "valid"},
		{name: "description required", mutate: func(event *RiskEvent) { event.Description = "" }, wantErr: true},
		{name: "impact type required", mutate: func(event *RiskEvent) { event.ImpactTypes = nil }, wantErr: true},
		{name: "extreme reason optional", mutate: func(event *RiskEvent) { event.Severity = RiskEventSeverityExtreme }},
		{name: "ongoing action optional", mutate: func(event *RiskEvent) { event.PostResponseCondition = "ongoing" }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := validRiskEvent()
			if tt.mutate != nil {
				tt.mutate(&event)
			}
			if err := event.Validate(); (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRiskEventSourceValidation(t *testing.T) {
	tests := []struct {
		name      string
		document  string
		refs      []DocumentSourceRef
		key       string
		wantError bool
	}{
		{name: "manual record"},
		{name: "valid imported record", document: "laporan.pdf", refs: []DocumentSourceRef{{Quote: "Layanan berhenti"}}, key: strings.Repeat("a", 64)},
		{name: "missing source name", refs: []DocumentSourceRef{{Quote: "Layanan berhenti"}}, wantError: true},
		{name: "missing quotes", document: "laporan.pdf", wantError: true},
		{name: "blank quote", document: "laporan.pdf", refs: []DocumentSourceRef{{Quote: " "}}, wantError: true},
		{name: "invalid key", document: "laporan.pdf", refs: []DocumentSourceRef{{Quote: "Layanan berhenti"}}, key: "not-a-key", wantError: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := validRiskEvent()
			event.SourceDocumentName = tt.document
			event.SourceRefs = tt.refs
			event.ExtractionKey = tt.key
			if err := event.Validate(); (err != nil) != tt.wantError {
				t.Fatalf("Validate=%v", err)
			}
		})
	}
}
