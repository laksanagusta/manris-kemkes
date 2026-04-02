package openai

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestMeetingMinutesExpandedSchemaUnmarshal(t *testing.T) {
	payload := []byte(`{
		"title": "Rapat Koordinasi MBG",
		"date": "2026-03-31",
		"participants": ["Dina", "Arif"],
		"agenda": ["Tindak lanjut vendor", "Validasi data"],
		"summary": "Rapat fokus pada tindak lanjut operasional.",
		"keyPoints": [
			"Verifikasi vendor perlu dipercepat minggu ini.",
			"Data monitoring daerah masih belum sinkron."
		],
		"decisions": ["Audit vendor dilakukan minggu ini."],
		"openIssues": ["PIC audit lapangan belum ditetapkan."],
		"actionItems": [
			{
				"task": "Susun jadwal audit vendor",
				"pic": "",
				"ownerUnit": "Tim Program",
				"deadline": "",
				"priority": "High",
				"status": "blocked",
				"notes": "Menunggu penetapan PIC lapangan.",
				"relatedDecision": "Audit vendor dilakukan minggu ini.",
				"needsConfirmation": ["pic", "deadline"]
			}
		],
		"nextCheckIn": "2026-04-07"
	}`)

	var minutes entity.MeetingMinutes
	if err := json.Unmarshal(payload, &minutes); err != nil {
		t.Fatalf("unmarshal meeting minutes: %v", err)
	}

	if got := len(minutes.OpenIssues); got != 1 {
		t.Fatalf("expected 1 open issue, got %d", got)
	}

	if got := len(minutes.KeyPoints); got != 2 {
		t.Fatalf("expected 2 key points, got %d", got)
	}

	if got := minutes.ActionItems[0].Status; got != "blocked" {
		t.Fatalf("expected blocked status, got %q", got)
	}

	if got := len(minutes.ActionItems[0].NeedsConfirmation); got != 2 {
		t.Fatalf("expected 2 confirmation flags, got %d", got)
	}

	if got := minutes.NextCheckIn; got != "2026-04-07" {
		t.Fatalf("expected next check-in date to be preserved, got %q", got)
	}
}

func TestBuildMinutesPromptRequestsOperationalFields(t *testing.T) {
	repo := &aiRepository{}

	prompt := repo.buildMinutesPrompt("rapat tindak lanjut")

	for _, fragment := range []string{
		`"keyPoints": ["..."]`,
		`"openIssues": ["..."]`,
		`"nextCheckIn": "YYYY-MM-DD"`,
		`"status": "open|on_track|blocked"`,
		`"needsConfirmation": ["pic"]`,
	} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("expected prompt to contain %q", fragment)
		}
	}
}

func TestTranscriptAnalysisUnmarshalSupportsArrayPayload(t *testing.T) {
	payload := []byte(`[
		{
			"id": "grp-1",
			"targetType": "existing",
			"targetRiskId": "e8dd63f1-5c83-4f52-8b1c-b0f5d62b6f90",
			"targetRiskCode": "R-001",
			"targetRiskTitle": "Keterlambatan validasi laporan",
			"matchConfidence": 84,
			"quote": "Kita harus menambahkan mitigasi berupa audit laporan.",
			"reasoning": "Pembahasan mengarah pada risiko existing yang sama.",
			"changes": [
				{
					"id": "chg-1",
					"field": "mitigations",
					"operation": "append",
					"label": "Tambah mitigasi audit laporan",
					"value": {
						"action": "Audit laporan",
						"owner": "",
						"frequency": "insidental"
					},
					"reasoning": "Mitigasi baru disebut eksplisit.",
					"quote": "tambahkan mitigasi audit laporan"
				}
			]
		}
	]`)

	var analysis entity.TranscriptAnalysis
	if err := json.Unmarshal(payload, &analysis); err != nil {
		t.Fatalf("unmarshal transcript suggestions array: %v", err)
	}

	if got := len(analysis.Suggestions); got != 1 {
		t.Fatalf("expected 1 suggestion, got %d", got)
	}

	if got := analysis.Suggestions[0].TargetType; got != "existing" {
		t.Fatalf("expected existing target type, got %q", got)
	}

	if got := len(analysis.Suggestions[0].Changes); got != 1 {
		t.Fatalf("expected 1 change, got %d", got)
	}
}

func TestBuildTranscriptPromptRequestsSuggestionsEnvelope(t *testing.T) {
	repo := &aiRepository{}

	prompt := repo.buildTranscriptPrompt("rapat risiko", `[{"id":"1","code":"R-001","title":"Risiko A"}]`)

	for _, fragment := range []string{
		`{
  "suggestions": [`,
		`"targetType": "existing|new"`,
		`"candidateRisks": [`,
		`"field": "description|cause|impactDesc|existingControl|treatmentOption|mitigations|probability|impact"`,
		`"operation": "set|append"`,
		`"draftPrefill": {`,
		`Daftar risiko existing aktif saat ini`,
	} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("expected prompt to contain %q", fragment)
		}
	}
}
