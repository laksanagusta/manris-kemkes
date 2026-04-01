package entity

import (
	"time"

	"github.com/google/uuid"
)

type MeetingMinute struct {
	ID             uuid.UUID    `json:"id"`
	Title          string       `json:"title"`
	Date           time.Time    `json:"date"`
	Participants   []string     `json:"participants"`
	Agenda         []string     `json:"agenda"`
	Summary        string       `json:"summary"`
	KeyPoints      []string     `json:"keyPoints"`
	Decisions      []string     `json:"decisions"`
	OpenIssues     []string     `json:"openIssues"`
	ActionItems    []ActionItem `json:"actionItems"`
	NextCheckIn    *time.Time   `json:"nextCheckIn,omitempty"`
	Transcript     string       `json:"transcript"`
	OrganizationID *uuid.UUID   `json:"organizationId,omitempty"`
	CreatedBy      uuid.UUID    `json:"createdBy"`
	CreatedByName  string       `json:"createdByName"`
	CreatedAt      time.Time    `json:"createdAt"`
	UpdatedAt      time.Time    `json:"updatedAt"`
}

type MeetingMinutesRisk struct {
	ID           uuid.UUID `json:"id"`
	MeetingID    uuid.UUID `json:"meetingId"`
	RiskID       uuid.UUID `json:"riskId"`
	RiskCode     string    `json:"riskCode,omitempty"`
	RiskTitle    string    `json:"riskTitle,omitempty"`
	LinkedBy     uuid.UUID `json:"linkedBy"`
	LinkedByName string    `json:"linkedByName,omitempty"`
	LinkedAt     time.Time `json:"linkedAt"`
}

type CreateMeetingMinuteInput struct {
	Title          string
	Date           time.Time
	Participants   []string
	Agenda         []string
	Summary        string
	KeyPoints      []string
	Decisions      []string
	OpenIssues     []string
	ActionItems    []ActionItem
	NextCheckIn    *time.Time
	Transcript     string
	OrganizationID *uuid.UUID
	CreatedBy      uuid.UUID
	RiskIDs        []uuid.UUID
}

type MeetingMinuteWithRisks struct {
	MeetingMinute
	LinkedRisks []MeetingMinutesRisk `json:"linkedRisks"`
}
