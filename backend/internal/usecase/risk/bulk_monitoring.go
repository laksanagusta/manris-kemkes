package risk

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	apperrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/xuri/excelize/v2"
)

// bulkMonitoringTemplateColumns defines the current 18-column monitoring layout (0-indexed).
var bulkMonitoringTemplateColumns = []string{
	"NO",                       // 0
	"RISIKO",                   // 1
	"KODE RISIKO",              // 2
	"TARGET P",                 // 3
	"TARGET D",                 // 4
	"TARGET BOBOT",             // 5
	"TARGET NILAI",             // 6
	"TARGET TINGKAT RISIKO",    // 7
	"PRIORITAS RISIKO",         // 8
	"URAIAN PENGENDALIAN",      // 9
	"JADWAL PELAKSANAAN",       // 10
	"REALISASI P",              // 11 (user-editable)
	"REALISASI D",              // 12 (user-editable)
	"REALISASI BOBOT",          // 13 (computed by server)
	"REALISASI NILAI",          // 14 (computed by server)
	"REALISASI TINGKAT RISIKO", // 15 (computed by server)
	"SIMPULAN",                 // 16 (computed by server)
	"EFEKTIVITAS",              // 17 (computed by server)
}

// bulkMonitoringLegacyTemplateColumns preserves the old 16-column upload layout.
var bulkMonitoringLegacyTemplateColumns = []string{
	"NO",                       // 0
	"KODE RISIKO",              // 1
	"URAIAN RISIKO",            // 2
	"TARGET P",                 // 3
	"TARGET D",                 // 4
	"TARGET BOBOT",             // 5
	"TARGET NILAI",             // 6
	"TARGET TINGKAT RISIKO",    // 7
	"REALISASI P",              // 8
	"REALISASI D",              // 9
	"REALISASI BOBOT",          // 10
	"REALISASI NILAI",          // 11
	"REALISASI TINGKAT RISIKO", // 12
	"SIMPULAN",                 // 13
	"EFEKTIVITAS",              // 14
	"JADWAL PELAKSANAAN",       // 15
}

// skipMonitoringCols are computed/auto-generated columns that should NOT be parsed as input.
var skipMonitoringCols = map[int]bool{
	0:  true, // NO
	5:  true, // TARGET BOBOT (computed)
	6:  true, // TARGET NILAI (computed)
	7:  true, // TARGET TINGKAT RISIKO (computed)
	13: true, // REALISASI BOBOT (computed)
	14: true, // REALISASI NILAI (computed)
	15: true, // REALISASI TINGKAT RISIKO (computed)
	16: true, // SIMPULAN (computed)
	17: true, // EFEKTIVITAS (computed)
}

// skipMonitoringLegacyCols preserves the old computed columns for compatibility with older uploads/tests.
var skipMonitoringLegacyCols = map[int]bool{
	0:  true, // NO
	5:  true, // TARGET BOBOT (computed)
	6:  true, // TARGET NILAI (computed)
	7:  true, // TARGET TINGKAT RISIKO (computed)
	10: true, // REALISASI BOBOT (computed)
	11: true, // REALISASI NILAI (computed)
	12: true, // REALISASI TINGKAT RISIKO (computed)
	13: true, // SIMPULAN (computed)
	14: true, // EFEKTIVITAS (computed)
}

// bulkMonitoringColumnAliases maps normalized header names (lowercase, no spaces/slashes) to canonical column names
var bulkMonitoringColumnAliases = map[string]string{
	// Direct column names
	"no":                       "NO",
	"koderisiko":               "KODE RISIKO",
	"kode risiko":              "KODE RISIKO",
	"risiko":                   "RISIKO",
	"uraian risiko":            "URAIAN RISIKO",
	"uraianrisiko":             "URAIAN RISIKO",
	"uraian pengendalian":      "URAIAN PENGENDALIAN",
	"uraianpengendalian":       "URAIAN PENGENDALIAN",
	"target p":                 "TARGET P",
	"targetp":                  "TARGET P",
	"target d":                 "TARGET D",
	"targetd":                  "TARGET D",
	"target bobot":             "TARGET BOBOT",
	"targetbobot":              "TARGET BOBOT",
	"target nilai":             "TARGET NILAI",
	"targetnilai":              "TARGET NILAI",
	"target tingkat risiko":    "TARGET TINGKAT RISIKO",
	"targettingkatriko":        "TARGET TINGKAT RISIKO",
	"prioritas risiko":         "PRIORITAS RISIKO",
	"prioritasrisiko":          "PRIORITAS RISIKO",
	"realisasi p":              "REALISASI P",
	"realisasip":               "REALISASI P",
	"realisasi d":              "REALISASI D",
	"realisasid":               "REALISASI D",
	"realisasi bobot":          "REALISASI BOBOT",
	"realisasibobot":           "REALISASI BOBOT",
	"realisasi nilai":          "REALISASI NILAI",
	"realisasinilai":           "REALISASI NILAI",
	"realisasi tingkat risiko": "REALISASI TINGKAT RISIKO",
	"realisasitingkatriko":     "REALISASI TINGKAT RISIKO",
	"simpulan":                 "SIMPULAN",
	"simpulan tingkat risiko":  "SIMPULAN",
	"efektivitas":              "EFEKTIVITAS",
	"efektifitas":              "EFEKTIVITAS",
	"jadwal pelaksanaan":       "JADWAL PELAKSANAAN",
	"jadwalpelaksanaan":        "JADWAL PELAKSANAAN",
}

// BulkMonitoringSpreadsheetUseCase handles bulk monitoring spreadsheet operations.
// Methods to add in Tasks 2 & 3:
//   - Template(ctx context.Context, orgID uuid.UUID, cycle string) ([]byte, string, error)
//   - Preview(ctx context.Context, input BulkMonitoringSpreadsheetInput) (*BulkMonitoringSpreadsheetOutput, error)
type BulkMonitoringSpreadsheetUseCase struct {
	orgRepo  repository.OrganizationRepository
	userRepo repository.UserRepository
	riskRepo repository.RiskRepository
}

func NewBulkMonitoringSpreadsheetUseCase(
	orgRepo repository.OrganizationRepository,
	userRepo repository.UserRepository,
	riskRepo repository.RiskRepository,
) *BulkMonitoringSpreadsheetUseCase {
	return &BulkMonitoringSpreadsheetUseCase{
		orgRepo:  orgRepo,
		userRepo: userRepo,
		riskRepo: riskRepo,
	}
}

// BulkMonitoringSpreadsheetInput represents the input for parsing a monitoring spreadsheet
type BulkMonitoringSpreadsheetInput struct {
	Filename       string
	Content        []byte
	UploaderID     uuid.UUID
	OrganizationID uuid.UUID
	Cycle          string // "2026-H1" format
}

// BulkMonitoringPreviewItem mirrors BulkRiskPreviewItem structure but with monitoring fields
type BulkMonitoringPreviewItem struct {
	ClientKey       string                        `json:"clientKey"`
	RowNumber       int                           `json:"rowNumber"`
	Raw             map[string]string             `json:"raw"`
	Code            string                        `json:"code,omitempty"`            // Kode Risiko
	Title           string                        `json:"title,omitempty"`           // Uraian Risiko
	InherentScore   float64                       `json:"inherentScore,omitempty"`   // from approved risk
	TargetP         int                           `json:"targetP,omitempty"`         // from approved risk
	TargetD         int                           `json:"targetD,omitempty"`         // from approved risk
	TargetBobot     float64                       `json:"targetBobot,omitempty"`     // from approved risk
	TargetNilai     float64                       `json:"targetNilai,omitempty"`     // computed
	TargetTingkat   string                        `json:"targetTingkat,omitempty"`   // from approved risk
	RealisasiP      int                           `json:"realisasiP,omitempty"`      // user input from template
	RealisasiD      int                           `json:"realisasiD,omitempty"`      // user input from template
	ComputedBobot   float64                       `json:"computedBobot,omitempty"`   // server computed
	ComputedNilai   float64                       `json:"computedNilai,omitempty"`   // server computed
	ComputedTingkat string                        `json:"computedTingkat,omitempty"` // server computed
	Simpulan        string                        `json:"simpulan,omitempty"`        // server computed
	Efektivitas     string                        `json:"efektivitas,omitempty"`     // server computed
	Payload         *BulkMonitoringBatchItemInput `json:"payload,omitempty"`         // set if valid
	Errors          []string                      `json:"errors"`                    // validation errors
	Warnings        []string                      `json:"warnings"`                  // warnings (skip but not error)
}

// BulkMonitoringSpreadsheetOutput represents the output of a monitoring spreadsheet preview
type BulkMonitoringSpreadsheetOutput struct {
	Items []BulkMonitoringPreviewItem `json:"items"`
}

// BulkMonitoringBatchItemInput represents a single item for batch monitoring submission
type BulkMonitoringBatchItemInput struct {
	ClientKey  string `json:"clientKey"`
	Code       string `json:"code"`       // Kode Risiko to match
	RealisasiP int    `json:"realisasiP"` // 1-5
	RealisasiD int    `json:"realisasiD"` // 1-5
}

// BulkMonitoringBatchItemOutput represents the result of a single batch monitoring item
type BulkMonitoringBatchItemOutput struct {
	ClientKey string     `json:"clientKey"`
	ID        *uuid.UUID `json:"id,omitempty"`
	Code      *string    `json:"code,omitempty"`
	Status    string     `json:"status"` // "created" | "failed"
	Message   string     `json:"message"`
	Error     string     `json:"error,omitempty"`
}

// BulkMonitoringBatchOutput represents the output of a batch monitoring submission
type BulkMonitoringBatchOutput struct {
	Items []BulkMonitoringBatchItemOutput `json:"items"`
}

// Template generates a monitoring spreadsheet template pre-filled with approved risks.
func (uc *BulkMonitoringSpreadsheetUseCase) Template(ctx context.Context, orgID uuid.UUID, cycle string) ([]byte, string, error) {
	if !IsValidCycleFormat(cycle) {
		return nil, "", apperrors.Wrap(apperrors.ErrInvalidInput, "cycle must be in YYYY-QN format (e.g. 2026-Q1)")
	}

	org, err := uc.orgRepo.GetByID(ctx, orgID)
	if err != nil {
		return nil, "", apperrors.Wrap(err, "organization not found")
	}

	risks, err := uc.riskRepo.List(ctx, []uuid.UUID{orgID}, entity.RiskStatusApproved, "")
	if err != nil {
		return nil, "", apperrors.Wrap(err, "failed to load risks")
	}

	// Filter to only current approved risks
	var currentRisks []*entity.Risk
	for _, r := range risks {
		if r.IsCurrent {
			currentRisks = append(currentRisks, r)
		}
	}

	f := excelize.NewFile()
	sheetName := "Template Upload"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, "", err
	}
	f.DeleteSheet("Sheet1")
	f.SetActiveSheet(index)

	if err := writeMonitoringHeaders(f, sheetName); err != nil {
		return nil, "", err
	}

	if err := writeMonitoringDataRows(f, sheetName, currentRisks); err != nil {
		return nil, "", err
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", err
	}

	sanitizedOrgName := strings.ReplaceAll(org.Name, " ", "_")
	filename := fmt.Sprintf("bulk-monitoring-template-%s-%s.xlsx", sanitizedOrgName, cycle)
	return buf.Bytes(), filename, nil
}

// writeMonitoringHeaders writes the 3-row header for the monitoring template (A1-based).
func writeMonitoringHeaders(f *excelize.File, sheet string) error {
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: "Bookman Old Style", Bold: true, Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"E3E3E3"}},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
		},
	})
	if err != nil {
		return err
	}

	// Row 1: top headers and grouped sections.
	groupHeaders := []struct {
		value    string
		startCol int
		endCol   int
	}{
		{"NO", 1, 1},
		{"RISIKO", 2, 2},
		{"KODE RISIKO", 3, 3},
		{"P", 4, 4},
		{"D", 5, 5},
		{"BOBOT", 6, 6},
		{"NILAI", 7, 7},
		{"TINGKAT RISIKO", 8, 8},
		{"PRIORITAS RISIKO", 9, 9},
		{"URAIAN PENGENDALIAN", 10, 10},
		{"JADWAL PELAKSANAAN", 11, 11},
	}
	for _, gh := range groupHeaders {
		startCell, _ := excelize.CoordinatesToCellName(gh.startCol, 1)
		if err := f.SetCellValue(sheet, startCell, gh.value); err != nil {
			return err
		}
	}

	if err := f.MergeCell(sheet, "L1", "P1"); err != nil {
		return err
	}
	if err := f.SetCellValue(sheet, "L1", "HASIL PEMANTAUAN"); err != nil {
		return err
	}
	if err := f.MergeCell(sheet, "Q1", "R1"); err != nil {
		return err
	}
	if err := f.SetCellValue(sheet, "Q1", "SIMPULAN"); err != nil {
		return err
	}

	// Row 2: sub-headers for grouped columns.
	subHeaders := map[int]string{
		12: "P",
		13: "D",
		14: "BOBOT",
		15: "NILAI",
		16: "TINGKAT RISIKO",
		17: "TINGKAT RISIKO",
		18: "EFEKTIFITAS",
	}
	for col, val := range subHeaders {
		cell, _ := excelize.CoordinatesToCellName(col, 2)
		if err := f.SetCellValue(sheet, cell, val); err != nil {
			return err
		}
	}

	// Merge all single-column headers vertically across rows 1-2.
	verticalMergeCols := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}
	for _, col := range verticalMergeCols {
		startCell, _ := excelize.CoordinatesToCellName(col, 1)
		endCell, _ := excelize.CoordinatesToCellName(col, 2)
		if err := f.MergeCell(sheet, startCell, endCell); err != nil {
			return err
		}
	}

	// Row 3: Column numbers (1-18)
	for col := 1; col <= 18; col++ {
		cell, _ := excelize.CoordinatesToCellName(col, 3)
		if err := f.SetCellValue(sheet, cell, col); err != nil {
			return err
		}
	}

	// Apply header style to all header rows (rows 1-3)
	for row := 1; row <= 3; row++ {
		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(18, row)
		if err := f.SetCellStyle(sheet, startCell, endCell, headerStyle); err != nil {
			return err
		}
	}

	// Column widths for the new monitoring layout.
	colWidths := map[string]float64{
		"A": 5, "B": 26, "C": 14, "D": 8, "E": 8, "F": 13, "G": 13, "H": 20,
		"I": 14, "J": 32, "K": 18, "L": 8, "M": 8, "N": 13, "O": 13, "P": 20,
		"Q": 22, "R": 16,
	}
	for col, width := range colWidths {
		if err := f.SetColWidth(sheet, col, col, width); err != nil {
			return err
		}
	}

	return nil
}

// writeMonitoringDataRows writes pre-filled data rows starting at row 4.
func writeMonitoringDataRows(f *excelize.File, sheet string, risks []*entity.Risk) error {
	// Computed column style: gray fill to indicate auto-calculated
	computedStyle, err := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
		},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F2F2F2"}},
	})
	if err != nil {
		return err
	}

	// Read-only cells coming from the approved risk record.
	prefilledStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: "Bookman Old Style", Size: 11},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
		},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F2F2F2"}},
	})
	if err != nil {
		return err
	}

	// Data cell style
	dataStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: "Bookman Old Style", Size: 11},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
		},
	})
	if err != nil {
		return err
	}

	for i, risk := range risks {
		row := i + 4 // Data starts at row 4

		// Col A (1): NO
		cell, _ := excelize.CoordinatesToCellName(1, row)
		f.SetCellValue(sheet, cell, i+1)

		// Col B (2): Risiko
		cell, _ = excelize.CoordinatesToCellName(2, row)
		f.SetCellValue(sheet, cell, risk.Title)

		// Col C (3): Kode Risiko
		cell, _ = excelize.CoordinatesToCellName(3, row)
		f.SetCellValue(sheet, cell, risk.Code)

		// Col D (4): Target P (pre-filled)
		cell, _ = excelize.CoordinatesToCellName(4, row)
		if risk.TargetProbability > 0 {
			f.SetCellValue(sheet, cell, risk.TargetProbability)
		}

		// Col E (5): Target D (pre-filled)
		cell, _ = excelize.CoordinatesToCellName(5, row)
		if risk.TargetImpact > 0 {
			f.SetCellValue(sheet, cell, risk.TargetImpact)
		}

		// Col F (6): Target Bobot (computed, pre-filled)
		cell, _ = excelize.CoordinatesToCellName(6, row)
		targetBobot := risk.TargetWeight
		if targetBobot == 0 && risk.TargetProbability > 0 && risk.TargetImpact > 0 {
			targetBobot = entity.GetBobot(risk.TargetProbability, risk.TargetImpact)
		}
		if targetBobot > 0 {
			f.SetCellValue(sheet, cell, targetBobot)
		}

		// Col G (7): Target Nilai (prefilled from inherent score)
		cell, _ = excelize.CoordinatesToCellName(7, row)
		targetNilai := float64(risk.InherentScore)
		if targetNilai == 0 {
			targetNilai = risk.TargetNilai
		}
		if targetNilai == 0 && risk.TargetProbability > 0 && risk.TargetImpact > 0 && targetBobot > 0 {
			targetNilai = entity.CalculateNilai(risk.TargetProbability, risk.TargetImpact, targetBobot)
		}
		if targetNilai > 0 {
			f.SetCellValue(sheet, cell, targetNilai)
		}

		// Col H (8): Target Tingkat Risiko (prefilled from target nilai)
		cell, _ = excelize.CoordinatesToCellName(8, row)
		targetTingkat := ""
		if targetNilai > 0 {
			targetTingkat = entity.GetRiskLevelFromNilai(targetNilai)
		} else if risk.TargetProbability > 0 && risk.TargetImpact > 0 {
			// Calculate from scratch
			b := entity.GetBobot(risk.TargetProbability, risk.TargetImpact)
			n := entity.CalculateNilai(risk.TargetProbability, risk.TargetImpact, b)
			targetTingkat = entity.GetRiskLevelFromNilai(n)
		}
		if targetTingkat != "" {
			f.SetCellValue(sheet, cell, entity.GetRiskLevelDisplay(targetTingkat))
		}

		// Col I (9): Prioritas Risiko (pre-filled)
		cell, _ = excelize.CoordinatesToCellName(9, row)
		if risk.RiskPriority > 0 {
			f.SetCellValue(sheet, cell, risk.RiskPriority)
		}

		// Col J (10): Uraian Pengendalian (pre-filled if available)
		cell, _ = excelize.CoordinatesToCellName(10, row)
		if strings.TrimSpace(risk.ExistingControl) != "" {
			f.SetCellValue(sheet, cell, risk.ExistingControl)
		}

		// Col K (11): Jadwal Pelaksanaan (prefilled if available)
		cell, _ = excelize.CoordinatesToCellName(11, row)
		if schedule := formatMonitoringSchedule(risk); schedule != "" {
			f.SetCellValue(sheet, cell, schedule)
		}

		rowStr := strconv.Itoa(row)

		// Col L (12): Realisasi P — EMPTY (user fills)
		// Col M (13): Realisasi D — EMPTY (user fills)

		// Col N-R are formula-driven so the template can self-calculate when L/M are filled.
		if err := f.SetCellFormula(sheet, "N"+rowStr, monitoringBobotFormula(row)); err != nil {
			return err
		}
		if err := f.SetCellFormula(sheet, "O"+rowStr, monitoringNilaiFormula(row)); err != nil {
			return err
		}
		if err := f.SetCellFormula(sheet, "P"+rowStr, monitoringTingkatFormula(row)); err != nil {
			return err
		}
		if err := f.SetCellFormula(sheet, "Q"+rowStr, monitoringSimpulanFormula(row)); err != nil {
			return err
		}
		if err := f.SetCellFormula(sheet, "R"+rowStr, monitoringEfektivitasFormula(row)); err != nil {
			return err
		}

		// Apply styles to data row
		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(18, row)
		if err := f.SetCellStyle(sheet, startCell, endCell, dataStyle); err != nil {
			return err
		}

		// Apply gray fill to prefilled target/control columns (B-K) — read-only.
		targetStartCell, _ := excelize.CoordinatesToCellName(2, row)
		targetEndCell, _ := excelize.CoordinatesToCellName(11, row)
		if err := f.SetCellStyle(sheet, targetStartCell, targetEndCell, prefilledStyle); err != nil {
			return err
		}

		// Apply gray fill to computed columns (N-R) — server-computed.
		computedStartCell, _ := excelize.CoordinatesToCellName(14, row)
		computedEndCell, _ := excelize.CoordinatesToCellName(18, row)
		if err := f.SetCellStyle(sheet, computedStartCell, computedEndCell, computedStyle); err != nil {
			return err
		}
	}

	return nil
}

func formatMonitoringSchedule(risk *entity.Risk) string {
	if risk == nil {
		return ""
	}
	if schedule := strings.TrimSpace(risk.ReviewScheduleText); schedule != "" {
		return schedule
	}
	if risk.NextReviewDate != nil {
		return strings.TrimSpace(*risk.NextReviewDate)
	}
	return ""
}

func monitoringBobotFormula(row int) string {
	return fmt.Sprintf(
		`=IF(AND(L%d<>"",M%d<>""),CHOOSE(L%d,CHOOSE(M%d,1,1.5,2,3,4),CHOOSE(M%d,1,1.8,1.83,1.9,2.1),CHOOSE(M%d,1.17,1.42,1.43,1.46,1.47),CHOOSE(M%d,1.2,1.19,1.3,1.16,1.2),CHOOSE(M%d,1.5,1.4,1.13,1.15,1)),"")`,
		row, row, row, row, row, row, row, row,
	)
}

func monitoringNilaiFormula(row int) string {
	return fmt.Sprintf(`=IF(AND(L%d<>"",M%d<>""),ROUND(L%d*M%d*N%d,2),"")`, row, row, row, row, row)
}

func monitoringTingkatFormula(row int) string {
	return fmt.Sprintf(`=IF(O%d="","",IF(O%d>=20,"Sangat Tinggi",IF(O%d>=15,"Tinggi",IF(O%d>=10,"Sedang",IF(O%d>=5,"Rendah","Sangat Rendah")))))`, row, row, row, row, row)
}

func monitoringSimpulanFormula(row int) string {
	return fmt.Sprintf(`=IF(OR(O%d="",G%d=""),"",IF(O%d>G%d,"Meningkat",IF(O%d=G%d,"Tetap","Menurun")))`, row, row, row, row, row, row)
}

func monitoringEfektivitasFormula(row int) string {
	return fmt.Sprintf(`=IF(OR(O%d="",G%d=""),"",IF(O%d<=G%d,"Efektif","Tidak Efektif"))`, row, row, row, row)
}

// Preview parses a monitoring spreadsheet and returns preview items with computed values and validation.
func (uc *BulkMonitoringSpreadsheetUseCase) Preview(ctx context.Context, input BulkMonitoringSpreadsheetInput) (*BulkMonitoringSpreadsheetOutput, error) {
	if !IsValidCycleFormat(input.Cycle) {
		return nil, apperrors.Wrap(apperrors.ErrInvalidInput, "cycle must be in YYYY-QN format (e.g. 2026-Q1)")
	}

	risks, err := uc.riskRepo.List(ctx, []uuid.UUID{input.OrganizationID}, entity.RiskStatusApproved, "")
	if err != nil {
		return nil, apperrors.Wrap(err, "failed to load risks")
	}
	var currentRisks []*entity.Risk
	for _, r := range risks {
		if r.IsCurrent {
			currentRisks = append(currentRisks, r)
		}
	}

	codeToRisk := make(map[string]*entity.Risk)
	for _, r := range currentRisks {
		if r.Code != "" {
			codeToRisk[r.Code] = r
		}
	}

	codesWithDrafts := make(map[string]bool)
	for _, r := range currentRisks {
		versions, vErr := uc.riskRepo.ListVersions(ctx, r.VersionGroupID)
		if vErr != nil {
			continue
		}
		if FindInProgressReassessmentForCycle(versions, input.Cycle) != nil {
			codesWithDrafts[r.Code] = true
		}
	}

	records, err := parseBulkMonitoringRecords(input.Filename, input.Content)
	if err != nil {
		return nil, err
	}

	result := &BulkMonitoringSpreadsheetOutput{Items: make([]BulkMonitoringPreviewItem, 0, len(records))}
	for i, record := range records {
		item := mapBulkMonitoringRecord(record, i+1, codeToRisk, codesWithDrafts, input.Cycle)
		result.Items = append(result.Items, item)
	}
	return result, nil
}

func parseBulkMonitoringRecords(filename string, content []byte) ([]map[string]string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		reader := csv.NewReader(bytes.NewReader(content))
		rows, err := reader.ReadAll()
		if err != nil {
			return nil, apperrors.Wrap(err, "failed to parse csv")
		}
		return rowsToBulkMonitoringRecords(rows), nil
	default:
		f, err := excelize.OpenReader(bytes.NewReader(content))
		if err != nil {
			return nil, apperrors.Wrap(err, "failed to parse spreadsheet")
		}
		defer f.Close()

		preferred := ""
		for _, name := range f.GetSheetList() {
			lower := strings.ToLower(name)
			if strings.Contains(lower, "template") || strings.Contains(lower, "upload") || strings.Contains(lower, "pemantauan") {
				preferred = name
				break
			}
		}
		if preferred == "" {
			sheets := f.GetSheetList()
			if len(sheets) == 0 {
				return nil, fmt.Errorf("spreadsheet has no sheets")
			}
			preferred = sheets[0]
		}

		rows, err := f.GetRows(preferred)
		if err != nil {
			return nil, apperrors.Wrap(err, "failed to read worksheet")
		}

		colNumRow := findMonitoringColumnNumbersRow(rows)
		if colNumRow >= 0 {
			return rowsToBulkMonitoringRecordsPositionBased(rows, colNumRow), nil
		}
		return rowsToBulkMonitoringRecords(rows), nil
	}
}

func findMonitoringColumnNumbersRow(rows [][]string) int {
	for i, row := range rows {
		if isMonitoringColumnNumbersRow(row) {
			return i
		}
	}
	return -1
}

func isMonitoringColumnNumbersRow(row []string) bool {
	count := 0
	for i, cell := range row {
		num, err := strconv.Atoi(strings.TrimSpace(cell))
		if err != nil || num != i+1 {
			break
		}
		count++
	}
	return count >= 10
}

func rowsToBulkMonitoringRecords(rows [][]string) []map[string]string {
	if len(rows) == 0 {
		return nil
	}
	headIndex := findMonitoringHeaderRow(rows)
	headers := make([]string, len(rows[headIndex]))
	for i, cell := range rows[headIndex] {
		normalized := normalizeMonitoringHeader(cell)
		if alias, ok := bulkMonitoringColumnAliases[normalized]; ok {
			headers[i] = alias
		} else {
			headers[i] = strings.TrimSpace(cell)
		}
	}
	var records []map[string]string
	for _, row := range rows[headIndex+1:] {
		if isMonitoringEmptyRow(row) {
			continue
		}
		record := map[string]string{}
		for i, header := range headers {
			if header == "" {
				continue
			}
			if i < len(row) {
				record[header] = strings.TrimSpace(row[i])
			} else {
				record[header] = ""
			}
		}
		records = append(records, record)
	}
	return records
}

func rowsToBulkMonitoringRecordsPositionBased(rows [][]string, headerIndex int) []map[string]string {
	useNewLayout := len(rows[headerIndex]) >= 18
	var records []map[string]string
	for _, row := range rows[headerIndex+1:] {
		if isMonitoringEmptyRow(row) {
			continue
		}
		record := map[string]string{}
		if useNewLayout {
			for colIdx, colName := range bulkMonitoringTemplateColumns {
				if skipMonitoringCols[colIdx] {
					continue
				}
				if colIdx < len(row) {
					record[colName] = strings.TrimSpace(row[colIdx])
				} else {
					record[colName] = ""
				}
			}
		} else {
			for colIdx, colName := range bulkMonitoringLegacyTemplateColumns {
				if skipMonitoringLegacyCols[colIdx] {
					continue
				}
				if colIdx < len(row) {
					record[colName] = strings.TrimSpace(row[colIdx])
				} else {
					record[colName] = ""
				}
			}
		}
		records = append(records, record)
	}
	return records
}

func findMonitoringHeaderRow(rows [][]string) int {
	bestIndex, bestScore := 0, -1
	for i := 0; i < len(rows) && i < 8; i++ {
		score := 0
		for _, cell := range rows[i] {
			if bulkMonitoringColumnAliases[normalizeMonitoringHeader(cell)] != "" {
				score++
			}
		}
		if score > bestScore {
			bestIndex, bestScore = i, score
		}
	}
	return bestIndex
}

func normalizeMonitoringHeader(value string) string {
	return strings.ToLower(strings.NewReplacer(" ", "", "/", "", "_", "", "-", "").Replace(strings.TrimSpace(value)))
}

func isMonitoringEmptyRow(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

func mapBulkMonitoringRecord(
	record map[string]string,
	rowNumber int,
	codeToRisk map[string]*entity.Risk,
	codesWithDrafts map[string]bool,
	cycle string,
) BulkMonitoringPreviewItem {
	getVal := func(keys ...string) string {
		for _, key := range keys {
			if v, ok := record[key]; ok && strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		}
		return ""
	}

	errors := []string{}
	warnings := []string{}

	code := getVal("KODE RISIKO")
	title := getVal("URAIAN RISIKO", "RISIKO")
	realisasiPStr := getVal("REALISASI P")
	realisasiDStr := getVal("REALISASI D")

	item := BulkMonitoringPreviewItem{
		ClientKey: fmt.Sprintf("row-%d", rowNumber),
		RowNumber: rowNumber,
		Raw:       record,
		Code:      code,
		Title:     title,
	}

	if code == "" {
		errors = append(errors, "Kolom Kode Risiko wajib diisi.")
	} else {
		risk, found := codeToRisk[code]
		if !found {
			errors = append(errors, fmt.Sprintf("Risiko dengan kode '%s' tidak ditemukan.", code))
		} else {
			if codesWithDrafts[code] {
				warnings = append(warnings, fmt.Sprintf("Risiko '%s' sudah memiliki draf pemantauan untuk siklus %s.", code, cycle))
			}

			item.Title = risk.Title
			item.InherentScore = float64(risk.InherentScore)
			item.TargetP = risk.TargetProbability
			item.TargetD = risk.TargetImpact
			item.TargetBobot = risk.TargetWeight
			item.TargetNilai = item.InherentScore
			if item.TargetNilai == 0 {
				item.TargetNilai = risk.TargetNilai
			}
			item.TargetTingkat = entity.GetRiskLevelFromNilai(item.TargetNilai)

			if item.TargetBobot == 0 && item.TargetP > 0 && item.TargetD > 0 {
				item.TargetBobot = entity.GetBobot(item.TargetP, item.TargetD)
			}
			if item.TargetNilai == 0 && item.TargetP > 0 && item.TargetD > 0 && item.TargetBobot > 0 {
				item.TargetNilai = entity.CalculateNilai(item.TargetP, item.TargetD, item.TargetBobot)
			}
			if item.TargetTingkat == "" && item.TargetNilai > 0 {
				item.TargetTingkat = entity.GetRiskLevelFromNilai(item.TargetNilai)
			}
		}
	}

	realisasiP := parseMonitoringInt(realisasiPStr)
	realisasiD := parseMonitoringInt(realisasiDStr)

	if realisasiPStr == "" {
		errors = append(errors, "Kolom Realisasi P wajib diisi.")
	} else if realisasiP < 1 || realisasiP > 5 {
		errors = append(errors, "Kolom Realisasi P harus angka 1-5.")
	}

	if realisasiDStr == "" {
		errors = append(errors, "Kolom Realisasi D wajib diisi.")
	} else if realisasiD < 1 || realisasiD > 5 {
		errors = append(errors, "Kolom Realisasi D harus angka 1-5.")
	}

	if realisasiP >= 1 && realisasiP <= 5 && realisasiD >= 1 && realisasiD <= 5 {
		item.RealisasiP = realisasiP
		item.RealisasiD = realisasiD

		bobot := entity.GetBobot(realisasiP, realisasiD)
		nilai := entity.CalculateNilai(realisasiP, realisasiD, bobot)
		tingkat := entity.GetRiskLevelFromNilai(nilai)

		item.ComputedBobot = bobot
		item.ComputedNilai = nilai
		item.ComputedTingkat = tingkat

		targetNilai := item.TargetNilai
		if targetNilai > 0 {
			if nilai > targetNilai {
				item.Simpulan = "Meningkat"
			} else if nilai == targetNilai {
				item.Simpulan = "Tetap"
			} else {
				item.Simpulan = "Menurun"
			}

			if nilai <= targetNilai {
				item.Efektivitas = "Efektif"
			} else {
				item.Efektivitas = "Tidak Efektif"
			}
		}
	}

	if len(errors) == 0 && code != "" {
		if _, found := codeToRisk[code]; found {
			item.Payload = &BulkMonitoringBatchItemInput{
				ClientKey:  item.ClientKey,
				Code:       code,
				RealisasiP: realisasiP,
				RealisasiD: realisasiD,
			}
		}
	}

	item.Errors = errors
	item.Warnings = warnings
	return item
}

func parseMonitoringInt(value string) int {
	parsed, _ := strconv.Atoi(strings.TrimSpace(value))
	return parsed
}
