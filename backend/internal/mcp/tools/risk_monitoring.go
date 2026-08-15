package tools

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/mcp/mapping"
	"github.com/manris/backend/internal/mcp/session"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// ErrMonitoringNotDraft is returned when the monitoring draft update target
// is not in the draft status.
var ErrMonitoringNotDraft = errors.New("hanya dapat memperbarui draft pemantauan dalam status draft")

type RiskMonitoringStarter interface {
	Execute(ctx context.Context, input riskuc.StartMonitoringInput) (*riskuc.StartMonitoringOutput, error)
}

type RiskMonitoringDraftUpdater interface {
	Execute(ctx context.Context, input riskuc.UpdateMonitoringInput) (*riskuc.UpdateMonitoringOutput, error)
}

func HandleMonitorRisk(ctx context.Context, startUC RiskMonitoringStarter, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	riskIDStr, ok := args["riskId"].(string)
	if !ok || riskIDStr == "" {
		return nil, fmt.Errorf("kolom diperlukan tidak ditemukan: riskId")
	}
	riskID, err := uuid.Parse(riskIDStr)
	if err != nil {
		return nil, fmt.Errorf("format riskId tidak valid: %w", err)
	}

	cycle, ok := args["assessmentCycle"].(string)
	if !ok || cycle == "" {
		return nil, fmt.Errorf("kolom diperlukan tidak ditemukan: assessmentCycle")
	}

	startOutput, err := startUC.Execute(ctx, riskuc.StartMonitoringInput{
		SourceRiskID: riskID,
		Cycle:        cycle,
		OrgIDs:       sess.AccessibleOrgIDs,
		StartedBy:    sess.UserID,
	})
	if err != nil {
		return nil, err
	}
	if startOutput == nil || startOutput.Monitoring == nil {
		return nil, errors.New("monitoring transaction tidak menghasilkan data")
	}

	return map[string]interface{}{
		"id":            startOutput.Monitoring.ID.String(),
		"status":        startOutput.Monitoring.Status,
		"existingDraft": startOutput.ExistingDraft,
		"redirectUrl":   startOutput.RedirectURL,
		"cycle":         cycle,
	}, nil
}

func HandleUpdateMonitoringDraft(ctx context.Context, updateUC RiskMonitoringDraftUpdater, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	updateInput, err := mapping.ToUpdateMonitoringInput(args, sess)
	if err != nil {
		return nil, fmt.Errorf("input pembaruan tidak valid: %w", err)
	}

	output, err := updateUC.Execute(ctx, updateInput)
	if err != nil {
		return nil, err
	}
	if output == nil || output.Monitoring == nil {
		return nil, errors.New("monitoring draft tidak menghasilkan data")
	}

	return map[string]interface{}{
		"id":      output.Monitoring.ID.String(),
		"message": output.Message,
	}, nil
}
