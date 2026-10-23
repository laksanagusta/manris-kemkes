package openai

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	sdk "github.com/sashabaranov/go-openai"
)

func TestAllAIFeaturesBlockSensitiveInputAndContext(t *testing.T) {
	ctx := context.Background()
	features := []struct {
		name     string
		response string
		run      func(*aiRepository, string, string) error
	}{
		{"fishbone", `{}`, func(r *aiRepository, value, org string) error {
			_, err := r.GenerateFishbone(ctx, entity.AIRequest{Title: "Distribusi obat", Description: value}, org)
			return err
		}},
		{"impact", `Dampak operasional`, func(r *aiRepository, value, org string) error {
			_, err := r.GenerateImpact(ctx, entity.AIRequest{Title: "Distribusi obat", Description: value}, org)
			return err
		}},
		{"mitigation", `[]`, func(r *aiRepository, value, org string) error {
			_, err := r.GenerateMitigation(ctx, entity.AIRequest{Title: "Distribusi obat", Cause: value}, org)
			return err
		}},
		{"minutes", `{}`, func(r *aiRepository, value, org string) error {
			_, err := r.GenerateMeetingMinutes(ctx, value, org)
			return err
		}},
		{"transcript", `{}`, func(r *aiRepository, value, org string) error {
			_, err := r.AnalyzeTranscript(ctx, value, org)
			return err
		}},
		{"predictive", `[]`, func(r *aiRepository, value, org string) error {
			_, err := r.GeneratePredictive(ctx, []entity.Risk{{Code: "R-001", Title: value}}, org)
			return err
		}},
		{"suggestion", `{}`, func(r *aiRepository, value, org string) error {
			r.riskRepo = loggingRiskRepository{risks: []*entity.Risk{{ID: uuid.New(), Title: value}}}
			_, err := r.GenerateRiskSuggestions(ctx, org)
			return err
		}},
		{"incident extraction", `{}`, func(r *aiRepository, value, org string) error {
			_, err := r.GenerateIncidentBatchExtraction(ctx, entity.IncidentExtractionRequest{DocumentText: value}, org)
			return err
		}},
		{"incident suggestion", `[]`, func(r *aiRepository, value, org string) error {
			_, err := r.GenerateManualIncidentRiskSuggestions(ctx, entity.ManualIncidentRiskSuggestionRequest{Title: "Gangguan distribusi", Who: value}, org)
			return err
		}},
	}
	for _, feature := range features {
		t.Run(feature.name, func(t *testing.T) {
			for _, tc := range []struct {
				name, input, org string
				blocked          bool
			}{
				{"ordinary input", "Distribusi obat terlambat", "Unit pelayanan", false},
				{"email", "private-ai-7788@example.test", "Unit pelayanan", true},
				{"credential", "password: private-ai-7788", "Unit pelayanan", true},
				{"classified raw field", "RAHASIA", "Unit pelayanan", true},
				{"organization context", "Distribusi obat terlambat", "Email: private-ai-7788@example.test", true},
			} {
				t.Run(tc.name, func(t *testing.T) {
					logs := captureAILogs(t)
					client := &documentPayloadClient{content: feature.response}
					config := sdk.DefaultConfig("dummy-key")
					config.HTTPClient = client
					repo := &aiRepository{client: sdk.NewClientWithConfig(config), riskRepo: loggingRiskRepository{}}
					err := feature.run(repo, tc.input, tc.org)
					if tc.blocked {
						if !errors.Is(err, domainerrors.ErrSensitiveDataDetected) || !domainerrors.IsValidation(err) || client.calls != 0 {
							t.Fatalf("sensitive data must fail validation without provider access: calls=%d, error=%v", client.calls, err)
						}
						if !strings.Contains(err.Error(), "Permintaan AI") || strings.Contains(err.Error(), "unggah") {
							t.Fatal("non-import AI must have an appropriate recovery message")
						}
						if strings.Contains(err.Error(), "private-ai-7788") || strings.Contains(logs.String(), "private-ai-7788") {
							t.Fatal("sensitive content leaked into error or logs")
						}
					} else if err != nil || client.calls != 1 || client.request.Store {
						t.Fatalf("safe input must reach provider without stored completion: calls=%d, error=%v", client.calls, err)
					}
				})
			}
		})
	}
}

func TestRiskContextIsCheckedBeforeEncoding(t *testing.T) {
	for _, name := range []string{"transcript", "incident extraction", "incident suggestion"} {
		t.Run(name, func(t *testing.T) {
			client := &documentPayloadClient{}
			config := sdk.DefaultConfig("dummy-key")
			config.HTTPClient = client
			repo := &aiRepository{client: sdk.NewClientWithConfig(config), riskRepo: loggingRiskRepository{risks: []*entity.Risk{{ID: uuid.New(), Title: "RAHASIA", Status: entity.RiskStatusApproved}}}}
			var err error
			switch name {
			case "transcript":
				_, err = repo.AnalyzeTranscript(context.Background(), "Pembahasan operasional", "")
			case "incident extraction":
				_, err = repo.GenerateIncidentBatchExtraction(context.Background(), entity.IncidentExtractionRequest{DocumentText: "Keterlambatan distribusi"}, "")
			case "incident suggestion":
				_, err = repo.GenerateManualIncidentRiskSuggestions(context.Background(), entity.ManualIncidentRiskSuggestionRequest{Title: "Keterlambatan distribusi"}, "")
			}
			if !errors.Is(err, domainerrors.ErrSensitiveDataDetected) || client.calls != 0 {
				t.Fatalf("database context escaped detection: %v", err)
			}
		})
	}
}

func TestSharedOutboundBoundaryChecksEveryMessageAndDisablesStorage(t *testing.T) {
	for _, role := range []string{sdk.ChatMessageRoleSystem, sdk.ChatMessageRoleUser} {
		t.Run(role, func(t *testing.T) {
			client := &documentPayloadClient{content: "aman"}
			config := sdk.DefaultConfig("dummy-key")
			config.HTTPClient = client
			repo := &aiRepository{client: sdk.NewClientWithConfig(config)}
			_, err := repo.createChatCompletion(context.Background(), sdk.ChatCompletionRequest{Model: "gpt-4o-mini", Store: true, Messages: []sdk.ChatCompletionMessage{{Role: role, Content: "private-ai-7788@example.test"}}})
			if !errors.Is(err, domainerrors.ErrSensitiveDataDetected) || client.calls != 0 {
				t.Fatal("outbound message bypassed detection")
			}
			_, err = repo.createChatCompletion(context.Background(), sdk.ChatCompletionRequest{Model: "gpt-4o-mini", Store: true, Messages: []sdk.ChatCompletionMessage{{Role: role, Content: "Ringkasan operasional"}}})
			if err != nil || client.calls != 1 || client.request.Store {
				t.Fatal("stored completions must stay disabled")
			}
		})
	}
}
