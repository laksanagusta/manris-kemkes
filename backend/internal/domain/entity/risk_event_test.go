package entity

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func validRiskEvent() RiskEvent {
	return RiskEvent{
		Description: "Sistem pelaporan tidak dapat diakses",
		OccurredAt:  time.Now(), ImpactTypes: []string{"service"}, ActualImpact: "Pelaporan tertunda",
		Severity: RiskEventSeverityHigh, ImmediateResponse: "Menggunakan pencatatan manual",
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
		{name: "extreme reason required", mutate: func(event *RiskEvent) { event.Severity = RiskEventSeverityExtreme }, wantErr: true},
		{name: "ongoing action required", mutate: func(event *RiskEvent) { event.PostResponseCondition = "ongoing" }, wantErr: true},
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
