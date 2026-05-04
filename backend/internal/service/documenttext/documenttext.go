package documenttext

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/manris/backend/internal/domain/errors"
	"github.com/xuri/excelize/v2"
)

const DefaultMaxChars = 60000

type ExtractInput struct {
	Filename string
	Content  []byte
	MaxChars int
}

type ExtractResult struct {
	Text     string
	Length   int
	Warnings []string
}

func Extract(input ExtractInput) (*ExtractResult, error) {
	switch strings.ToLower(filepath.Ext(input.Filename)) {
	case ".pdf":
		text, err := extractPDF(input.Content)
		if err != nil {
			return nil, err
		}
		return extractAndTruncate(text, input.MaxChars)
	case ".xlsx":
		text, err := extractXLSX(input.Content)
		if err != nil {
			return nil, err
		}
		return extractAndTruncate(text, input.MaxChars)
	default:
		return nil, errors.Wrap(errors.ErrInvalidFileType, "only PDF and XLSX files are supported")
	}
}

func extractAndTruncate(text string, maxChars int) (*ExtractResult, error) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil, errors.ErrDocumentUnreadable
	}

	return truncateText(trimmed, maxChars), nil
}

func truncateText(text string, maxChars int) *ExtractResult {
	if maxChars <= 0 {
		maxChars = DefaultMaxChars
	}

	runes := []rune(text)
	result := &ExtractResult{
		Text:   text,
		Length: len(runes),
	}
	if len(runes) > maxChars {
		result.Text = string(runes[:maxChars])
		result.Warnings = append(result.Warnings, fmt.Sprintf("Document text was truncated to %d characters for AI analysis.", maxChars))
	}

	return result
}

func extractPDF(content []byte) (string, error) {
	tmpFile, err := os.CreateTemp("", "document-intelligence-*.pdf")
	if err != nil {
		return "", errors.Wrap(err, "failed to prepare temporary PDF")
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	if _, err := tmpFile.Write(content); err != nil {
		_ = tmpFile.Close()
		return "", errors.Wrap(err, "failed to write temporary PDF")
	}
	if err := tmpFile.Close(); err != nil {
		return "", errors.Wrap(err, "failed to close temporary PDF")
	}

	cmd := exec.Command("pdftotext", "-layout", "-enc", "UTF-8", tmpPath, "-")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", errors.Wrap(err, fmt.Sprintf("failed to extract PDF text: %s", string(output)))
	}

	return string(output), nil
}

func extractXLSX(content []byte) (string, error) {
	f, err := excelize.OpenReader(bytes.NewReader(content))
	if err != nil {
		return "", errors.Wrap(err, "failed to read spreadsheet")
	}
	defer f.Close()

	var b strings.Builder
	for _, sheet := range f.GetSheetList() {
		rows, err := f.GetRows(sheet)
		if err != nil {
			continue
		}
		for rowIndex, row := range rows {
			cells := make([]string, 0, len(row))
			for _, cell := range row {
				cell = strings.TrimSpace(cell)
				if cell != "" {
					cells = append(cells, cell)
				}
			}
			if len(cells) == 0 {
				continue
			}
			b.WriteString(fmt.Sprintf("Sheet: %s | Row %d\n%s\n\n", sheet, rowIndex+1, strings.Join(cells, " | ")))
		}
	}

	return b.String(), nil
}
