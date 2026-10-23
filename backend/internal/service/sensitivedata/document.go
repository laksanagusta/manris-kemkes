package sensitivedata

import (
	"encoding/json"
	"io"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

// ValidateTaskContext checks the decoded values actually included in the prompt.
// Scanning raw JSON alone would miss characters escaped with Unicode sequences.
func ValidateTaskContext(period string, tasks []entity.DocumentMitigationTaskContext) error {
	fields := make([]string, 0, 1+5*len(tasks))
	fields = append(fields, period)
	for _, task := range tasks {
		// IDs are database UUIDs, not document text. Reject arbitrary values instead
		// of misclassifying an all-numeric UUID segment as a phone number.
		if _, err := uuid.Parse(task.ID); err != nil {
			return domainerrors.Wrap(domainerrors.ErrInvalidInput, "Identitas tugas mitigasi tidak valid. Muat ulang cakupan, lalu coba lagi.")
		}
		fields = append(fields, task.RiskCode, task.RiskTitle, task.MitigationAction, task.PeriodLabel)
	}
	return validateFields(fields, MitigationContext)
}

// ValidateRequest is the last local check before an external document request.
// It neither masks input nor sends it to another service for classification.
func ValidateRequest(req entity.DocumentAnalysisRequest) error {
	if err := Validate(req.DocumentText, Document); err != nil {
		return err
	}
	if req.Mode != entity.DocumentModeMitigationReportMapper {
		return nil
	}
	var tasks []entity.DocumentMitigationTaskContext
	decoder := json.NewDecoder(strings.NewReader(req.OpenTasksJSON))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&tasks); err != nil {
		return domainerrors.Wrap(domainerrors.ErrInvalidInput, "Konteks tugas mitigasi tidak valid. Muat ulang cakupan, lalu coba lagi.")
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF || len(tasks) == 0 {
		return domainerrors.Wrap(domainerrors.ErrInvalidInput, "Konteks tugas mitigasi tidak valid. Muat ulang cakupan, lalu coba lagi.")
	}
	if err := ValidateTaskContext(req.Period, tasks); err != nil {
		return err
	}
	// Read every original string token as well. A typed decode keeps only the
	// last duplicate key, while the prompt would still include earlier values.
	values := []string{req.Period}
	tokens := json.NewDecoder(strings.NewReader(req.OpenTasksJSON))
	for {
		token, err := tokens.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return domainerrors.Wrap(domainerrors.ErrInvalidInput, "Konteks tugas mitigasi tidak valid. Muat ulang cakupan, lalu coba lagi.")
		}
		if value, ok := token.(string); ok {
			if _, err := uuid.Parse(value); err != nil {
				values = append(values, value)
			}
		}
	}
	return validateFields(values, MitigationContext)
}
