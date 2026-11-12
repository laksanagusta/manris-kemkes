package risk

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	apperrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/xuri/excelize/v2"
)

const bulkRiskCategoryColumn = "KATEGORI RISIKO"
const bulkRiskCategoryRequired = "Kolom Kategori Risiko wajib diisi."

var bulkRiskTemplateColumns = []string{
	"RISIKO",
	bulkRiskCategoryColumn,
	"KODE RISIKO",
	"SEBAB",
	"SUMBER RISIKO",
	"C/UC",
	"DAMPAK",
	"URAIAN",
	"EFEKTIF",
	"TIDAK EFEKTIF",
	"P",
	"D",
	"BOBOT",
	"NILAI",
	"TINGKAT RISIKO",
	"PRIORITAS RISIKO",
	"SELERA RISIKO",
	"PILIHAN PENANGANAN",
	"URAIAN (RPR)",
	"JADWAL PELAKSANAAN",
	"P (target)",
	"D (target)",
	"BOBOT (target)",
	"NILAI (target)",
	"TINGKAT RISIKO (target)",
}

var bulkRiskComputedColumns = map[string]bool{
	"KODE RISIKO":             true,
	"BOBOT":                   true,
	"NILAI":                   true,
	"TINGKAT RISIKO":          true,
	"PRIORITAS RISIKO":        true,
	"BOBOT (target)":          true,
	"NILAI (target)":          true,
	"TINGKAT RISIKO (target)": true,
}

var bulkRiskColumnAliases = map[string]string{
	"risiko":                  "RISIKO",
	"koderisiko":              "KODE RISIKO",
	"deskripsi":               "DESKRIPSI",
	"kategori":                bulkRiskCategoryColumn,
	"kategoririsiko":          bulkRiskCategoryColumn,
	"sebab":                   "SEBAB",
	"sumberrisiko":            "SUMBER RISIKO",
	"cuc":                     "C/UC",
	"dampak":                  "DAMPAK",
	"pengendalianuraian":      "URAIAN",
	"efektivitaspengendalian": "Efektivitas Pengendalian",
	"efektif":                 "EFEKTIF",
	"tidakefektif":            "TIDAK EFEKTIF",
	"p":                       "P",
	"d":                       "D",
	"bobot":                   "BOBOT",
	"nilai":                   "NILAI",
	"tingkatrisiko":           "TINGKAT RISIKO",
	"prioritasrisiko":         "PRIORITAS RISIKO",
	"selerarisiko":            "SELERA RISIKO",
	"pilihanpenangananrisiko": "PILIHAN PENANGANAN",
	"rpruraian":               "URAIAN (RPR)",
	"picrpr":                  "PIC RPR",
	"jadwalpelaksanaan":       "JADWAL PELAKSANAAN",
	"targetp":                 "P (target)",
	"targetd":                 "D (target)",
	"targetbobot":             "BOBOT (target)",
	"unitkerja":               "UNIT KERJA",
}

type BulkRiskSpreadsheetUseCase struct {
	orgRepo  repository.OrganizationRepository
	userRepo repository.UserRepository
}

func NewBulkRiskSpreadsheetUseCase(orgRepo repository.OrganizationRepository, userRepo repository.UserRepository) *BulkRiskSpreadsheetUseCase {
	return &BulkRiskSpreadsheetUseCase{orgRepo: orgRepo, userRepo: userRepo}
}

type BulkRiskSpreadsheetInput struct {
	Filename       string
	Content        []byte
	UploaderID     uuid.UUID
	OrganizationID *uuid.UUID // optional fallback org ID for all records
}

type BulkRiskPreviewItem struct {
	ClientKey string                    `json:"clientKey"`
	RowNumber int                       `json:"rowNumber"`
	Raw       map[string]string         `json:"raw"`
	Payload   *CreateRiskBatchItemInput `json:"payload,omitempty"`
	Errors    []string                  `json:"errors"`
	Warnings  []string                  `json:"warnings"`
}

type BulkRiskSpreadsheetOutput struct {
	Items []BulkRiskPreviewItem `json:"items"`
}

func (uc *BulkRiskSpreadsheetUseCase) Preview(ctx context.Context, input BulkRiskSpreadsheetInput) (*BulkRiskSpreadsheetOutput, error) {
	uploader, err := uc.userRepo.GetByID(ctx, input.UploaderID)
	if err != nil {
		return nil, apperrors.Wrap(err, "uploader not found")
	}
	orgs, err := uc.orgRepo.List(ctx)
	if err != nil {
		return nil, apperrors.Wrap(err, "failed to load organizations")
	}
	records, err := parseBulkRiskRecords(input.Filename, input.Content)
	if err != nil {
		return nil, err
	}
	result := &BulkRiskSpreadsheetOutput{Items: make([]BulkRiskPreviewItem, 0, len(records))}
	for i, record := range records {
		result.Items = append(result.Items, mapBulkRiskRecord(record, i+1, orgs, uploader, input.OrganizationID))
	}
	return result, nil
}

func (uc *BulkRiskSpreadsheetUseCase) Template() ([]byte, string, error) {
	f := excelize.NewFile()
	templateSheet := "Template Upload"
	index, err := f.NewSheet(templateSheet)
	if err != nil {
		return nil, "", err
	}
	f.DeleteSheet("Sheet1")
	f.SetActiveSheet(index)

	if err := writeSheet2StyleHeaders(f, templateSheet); err != nil {
		return nil, "", err
	}

	if _, err := f.NewSheet("Contoh Data"); err != nil {
		return nil, "", err
	}
	if err := writeSheet2StyleHeaders(f, "Contoh Data"); err != nil {
		return nil, "", err
	}
	example := []string{
		"Usulan layanan tidak sesuai kewenangan", // A: Risiko
		"Kepatuhan",                              // B: Kategori
		"RPL.01",                                 // C: Kode Risiko
		"Telaah tidak memadai",                   // D: Sebab
		"Internal",                               // E: Sumber Risiko
		"C",                                      // F: C/UC
		"Pelanggaran aturan",                     // G: Dampak
		"Telaah UPT",                             // H: Pengendalian Uraian
		"Ya",                                     // I: Efektif
		"",                                       // J: Tidak Efektif
		"2",                                      // K: P
		"2",                                      // L: D
		"1.8",                                    // M: Bobot
		"4",                                      // N: Nilai
		"Sedang",                                 // O: Tingkat Risiko
		"4",                                      // P: Prioritas Risiko
		"Dalam batas selera risiko",              // Q: Selera Risiko
		"Menerima risiko",                        // R: Pilihan Penanganan
		"Checklist kewenangan & review SKI pra-penugasan", // S: Uraian (RPR)
		"Feb 2026", // T: Jadwal Pelaksanaan
		"2",        // U: P (target)
		"2",        // V: D (target)
		"1.8",      // W: Bobot (target)
		"4",        // X: Nilai (target)
		"Sedang",   // Y: Tingkat Risiko (target)
	}
	if err := f.SetSheetRow("Contoh Data", "A5", &example); err != nil {
		return nil, "", err
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", err
	}
	return buf.Bytes(), "bulk-risk-template.xlsx", nil
}

func writeSheet2StyleHeaders(f *excelize.File, sheet string) error {
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

	groupHeaders := []struct {
		value    string
		startCol int
		endCol   int
	}{
		{"IDENTIFIKASI RISIKO", 1, 7},
		{"ANALISIS RISIKO", 8, 15},
		{"EVALUASI RISIKO", 16, 18},
		{"RENCANA PENANGANAN RISIKO (RPR)", 19, 20},
		{"TARGET PENURUNAN TINGKAT RISIKO", 21, 25},
	}
	for _, gh := range groupHeaders {
		startCell, _ := excelize.CoordinatesToCellName(gh.startCol, 1)
		endCell, _ := excelize.CoordinatesToCellName(gh.endCol, 1)
		if err := f.MergeCell(sheet, startCell, endCell); err != nil {
			return err
		}
		if err := f.SetCellValue(sheet, startCell, gh.value); err != nil {
			return err
		}
	}

	// --- Row 2: Sub-headers ---
	if err := f.MergeCell(sheet, "H2", "J2"); err != nil {
		return err
	}
	if err := f.SetCellValue(sheet, "H2", "PENGENDALIAN YANG ADA"); err != nil {
		return err
	}

	for index, header := range bulkRiskTemplateColumns {
		col := index + 1
		if col >= 8 && col <= 10 {
			cell, _ := excelize.CoordinatesToCellName(col, 3)
			if err := f.SetCellValue(sheet, cell, header); err != nil {
				return err
			}
			continue
		}

		startCell, _ := excelize.CoordinatesToCellName(col, 2)
		endCell, _ := excelize.CoordinatesToCellName(col, 3)
		if err := f.MergeCell(sheet, startCell, endCell); err != nil {
			return err
		}
		if err := f.SetCellValue(sheet, startCell, strings.TrimSuffix(header, " (target)")); err != nil {
			return err
		}
	}

	for col := 1; col <= len(bulkRiskTemplateColumns); col++ {
		cell, _ := excelize.CoordinatesToCellName(col, 4)
		if err := f.SetCellValue(sheet, cell, col); err != nil {
			return err
		}
	}

	for row := 1; row <= 4; row++ {
		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(len(bulkRiskTemplateColumns), row)
		if err := f.SetCellStyle(sheet, startCell, endCell, headerStyle); err != nil {
			return err
		}
	}

	colWidths := []float64{
		40, 20, 14, 32, 16, 8, 32, 35, 14, 14, 6, 6, 10,
		10, 18, 14, 22, 20, 35, 18, 6, 6, 10, 10, 18,
	}
	for index, width := range colWidths {
		col, _ := excelize.ColumnNumberToName(index + 1)
		if err := f.SetColWidth(sheet, col, col, width); err != nil {
			return err
		}
	}

	return nil
}

func parseBulkRiskRecords(filename string, content []byte) ([]map[string]string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		reader := csv.NewReader(bytes.NewReader(content))
		rows, err := reader.ReadAll()
		if err != nil {
			return nil, apperrors.Wrap(err, "failed to parse csv")
		}
		return rowsToBulkRiskRecords(rows), nil
	default:
		f, err := excelize.OpenReader(bytes.NewReader(content))
		if err != nil {
			return nil, apperrors.Wrap(err, "failed to parse spreadsheet")
		}
		defer f.Close()
		preferred := ""
		for _, name := range f.GetSheetList() {
			if strings.Contains(strings.ToLower(name), "template") || strings.Contains(strings.ToLower(name), "upload") {
				preferred = name
				break
			}
		}
		if preferred == "" {
			sheets := f.GetSheetList()
			if len(sheets) == 0 {
				return nil, fmt.Errorf("spreadsheet tidak memiliki sheet")
			}
			preferred = sheets[0]
		}
		rows, err := f.GetRows(preferred)
		if err != nil {
			return nil, apperrors.Wrap(err, "failed to read worksheet")
		}
		// Check for 4-row header format (column numbers row)
		colNumRow := findColumnNumbersRow(rows)
		if colNumRow >= 0 {
			return rowsToBulkRiskRecordsPositionBased(rows, colNumRow), nil
		}
		// Fall back to alias-based detection for old format
		return rowsToBulkRiskRecords(rows), nil
	}
}

func rowsToBulkRiskRecords(rows [][]string) []map[string]string {
	if len(rows) == 0 {
		return nil
	}
	headIndex := findBulkRiskHeaderRow(rows)
	headers := make([]string, len(rows[headIndex]))
	for i, cell := range rows[headIndex] {
		headers[i] = bulkRiskColumnAliases[normalizeBulkRiskHeader(cell)]
		if headers[i] == "" {
			headers[i] = strings.TrimSpace(cell)
		}
	}
	var records []map[string]string
	for _, row := range rows[headIndex+1:] {
		if isBulkRiskEmptyRow(row) {
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

func findColumnNumbersRow(rows [][]string) int {
	for i, row := range rows {
		if isColumnNumbersRow(row) {
			return i
		}
	}
	return -1
}

func isColumnNumbersRow(row []string) bool {
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

func rowsToBulkRiskRecordsPositionBased(rows [][]string, headerIndex int) []map[string]string {
	columns := bulkRiskTemplateColumns
	hasCategory := slices.ContainsFunc(rows[:headerIndex], func(row []string) bool {
		return len(row) > 1 && bulkRiskColumnAliases[normalizeBulkRiskHeader(row[1])] == bulkRiskCategoryColumn
	})
	if !hasCategory {
		columns = slices.Concat(columns[:1], columns[2:])
	}

	var records []map[string]string
	for _, row := range rows[headerIndex+1:] {
		if isBulkRiskEmptyRow(row) {
			continue
		}
		record := map[string]string{}
		for colIdx, colName := range columns {
			if bulkRiskComputedColumns[colName] {
				continue
			}
			if colIdx < len(row) {
				record[colName] = strings.TrimSpace(row[colIdx])
			} else {
				record[colName] = ""
			}
		}
		records = append(records, record)
	}
	return records
}

func findBulkRiskHeaderRow(rows [][]string) int {
	bestIndex, bestScore := 0, -1
	for i := 0; i < len(rows) && i < 8; i++ {
		score := 0
		for _, cell := range rows[i] {
			if bulkRiskColumnAliases[normalizeBulkRiskHeader(cell)] != "" {
				score++
			}
		}
		if score > bestScore {
			bestIndex, bestScore = i, score
		}
	}
	return bestIndex
}

func normalizeBulkRiskHeader(value string) string {
	return strings.ToLower(strings.NewReplacer(" ", "", "/", "", "_", "", "-", "").Replace(strings.TrimSpace(value)))
}

func isBulkRiskEmptyRow(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

func mapBulkRiskRecord(record map[string]string, rowNumber int, orgs []*entity.Organization, uploader *entity.User, defaultOrgID *uuid.UUID) BulkRiskPreviewItem {
	getVal := func(keys ...string) string {
		for _, key := range keys {
			if v, ok := record[key]; ok && strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		}
		return ""
	}

	efektif := getVal("EFEKTIF")
	tidakEfektif := getVal("TIDAK EFEKTIF")
	controlEff := ""
	if efektif != "" && tidakEfektif != "" {
		controlEff = "__both_efektif_tidak_efektif__"
	} else if efektif != "" {
		controlEff = "efektif"
	} else if tidakEfektif != "" {
		controlEff = "tidak_efektif"
	} else {
		controlEff = normalizeControlEffectiveness(
			getVal("Efektivitas Pengendalian", "EFEKTIVITAS PENGENDALIAN"),
		)
	}

	title := getVal("RISIKO")
	description := getVal("DESKRIPSI")

	item := CreateRiskBatchItemInput{
		ClientKey:            fmt.Sprintf("row-%d", rowNumber),
		Title:                title,
		Description:          description,
		Category:             normalizeBulkRiskCategory(getVal(bulkRiskCategoryColumn)),
		Cause:                splitBulkRiskMultiValue(getVal("SEBAB")),
		RiskSource:           normalizeRiskSource(getVal("SUMBER RISIKO")),
		Controllability:      normalizeControllability(getVal("C/UC")),
		ImpactDesc:           splitBulkRiskMultiValue(getVal("DAMPAK")),
		ExistingControl:      getVal("URAIAN"),
		ControlEffectiveness: controlEff,
		Probability:          parseBulkRiskInt(getVal("P")),
		Impact:               parseBulkRiskInt(getVal("D")),
		Weight:               parseBulkRiskFloat(getVal("BOBOT"), -1),
		RiskPriority:         parseBulkRiskInt(getVal("PRIORITAS RISIKO")),
		RiskAppetite:         getVal("SELERA RISIKO"),
		TreatmentOption:      normalizeTreatmentOption(getVal("PILIHAN PENANGANAN")),
		TargetProbability:    parseBulkRiskInt(getVal("P (target)")),
		TargetImpact:         parseBulkRiskInt(getVal("D (target)")),
		TargetWeight:         parseBulkRiskFloat(getVal("BOBOT (target)"), -1),
	}
	schedule := parseBulkRiskSchedule(getVal("JADWAL PELAKSANAAN"))
	if action := getVal("URAIAN (RPR)"); action != "" {
		owner := getVal("PIC RPR")
		var ownerUserID *uuid.UUID
		if owner == "" && uploader != nil {
			owner = strings.TrimSpace(uploader.Name)
			if owner == "" {
				owner = uploader.ID.String()
			}
			ownerUserID = &uploader.ID
		}
		item.Mitigations = []entity.Mitigation{{
			Action:                action,
			Owner:                 owner,
			OwnerUserID:           ownerUserID,
			Frequency:             schedule.Frequency,
			RecurringInterval:     schedule.RecurringInterval,
			DueDate:               schedule.DueDate,
			ExecutionScheduleText: schedule.ExecutionScheduleText,
		}}
	}

	errors := []string{}
	warnings := []string{}
	unitKerja := getVal("UNIT KERJA")
	if unitKerja != "" {
		matched := matchBulkRiskOrganization(orgs, unitKerja)
		if matched != nil {
			item.OrganizationID = &matched.ID
		} else {
			errors = append(errors, fmt.Sprintf("Unit Kerja '%s' tidak ditemukan di sistem.", unitKerja))
		}
	} else if defaultOrgID != nil {
		item.OrganizationID = defaultOrgID
	} else if uploader != nil && uploader.Role == "unit" {
		item.OrganizationID = uploader.OrganizationID
	} else {
		errors = append(errors, "OrganizationID is required: provide UNIT KERJA column or organization_id query param.")
	}
	if item.Weight <= 0 && item.Probability > 0 && item.Impact > 0 {
		item.Weight = entity.GetBobot(item.Probability, item.Impact)
	}
	if item.TargetWeight <= 0 && item.TargetProbability > 0 && item.TargetImpact > 0 {
		item.TargetWeight = entity.GetBobot(item.TargetProbability, item.TargetImpact)
	}
	if item.Title == "" {
		errors = append(errors, "Kolom Risiko wajib diisi.")
	}
	if item.Category == "" {
		errors = append(errors, bulkRiskCategoryRequired)
	} else if !entity.IsValidRiskCategory(item.Category) {
		errors = append(errors, "Kategori Risiko tidak valid. Gunakan Kebijakan, Operasional, Kepatuhan, Fraud - Korupsi, Reputasi, atau Legal.")
	}
	if rawRiskSource := getVal("SUMBER RISIKO"); rawRiskSource != "" && item.RiskSource != "internal" && item.RiskSource != "eksternal" {
		errors = append(errors, "Kolom Sumber Risiko harus berisi Internal atau external.")
	}
	if item.Controllability == "" {
		errors = append(errors, "Kolom C/UC harus berisi C atau UC.")
	} else if item.Controllability != "C" && item.Controllability != "UC" {
		errors = append(errors, "Kolom C/UC harus berisi C atau UC.")
	}
	if item.Probability < 1 || item.Probability > 5 {
		errors = append(errors, "Kolom P harus angka 1-5.")
	}
	if item.Impact < 1 || item.Impact > 5 {
		errors = append(errors, "Kolom D harus angka 1-5.")
	}
	if item.TargetProbability != 0 && (item.TargetProbability < 1 || item.TargetProbability > 5) {
		errors = append(errors, "Kolom Target P harus angka 1-5.")
	}
	if item.TargetImpact != 0 && (item.TargetImpact < 1 || item.TargetImpact > 5) {
		errors = append(errors, "Kolom Target D harus angka 1-5.")
	}
	if getVal("PILIHAN PENANGANAN") != "" && item.TreatmentOption == "" {
		errors = append(errors, "Pilihan Penanganan Risiko tidak dikenali.")
	} else if rawTreatmentOption := getVal("PILIHAN PENANGANAN"); rawTreatmentOption != "" &&
		item.TreatmentOption != "avoid" &&
		item.TreatmentOption != "transfer" &&
		item.TreatmentOption != "mitigate" &&
		item.TreatmentOption != "accept" {
		errors = append(errors, "Kolom Pilihan Penanganan harus berisi Menghindari Risiko, Berbagi Risiko, Mitigasi, atau Menerima Risiko.")
	}
	if controlEff == "__both_efektif_tidak_efektif__" {
		errors = append(errors, "Kolom EFEKTIF dan TIDAK EFEKTIF tidak boleh keduanya diisi.")
	} else if getVal("Efektivitas Pengendalian", "EFEKTIVITAS PENGENDALIAN") != "" && item.ControlEffectiveness == "" {
		errors = append(errors, "Efektivitas Pengendalian harus Efektif atau Tidak Efektif.")
	} else if controlEff != "" && controlEff != "efektif" && controlEff != "tidak_efektif" {
		errors = append(errors, "Kolom Efektivitas Pengendalian harus berisi Efektif atau Tidak Efektif.")
	}
	if len(item.Cause) == 0 {
		warnings = append(warnings, "Sebab kosong; risiko tetap bisa dibuat tetapi analisis menjadi minim.")
	}
	if len(item.ImpactDesc) == 0 {
		warnings = append(warnings, "Dampak kosong; risiko tetap bisa dibuat tetapi analisis menjadi minim.")
	}

	payload := &item
	if len(errors) > 0 {
		payload = nil
	}
	return BulkRiskPreviewItem{ClientKey: item.ClientKey, RowNumber: rowNumber, Raw: record, Payload: payload, Errors: errors, Warnings: warnings}
}

func matchBulkRiskOrganization(orgs []*entity.Organization, unitName string) *entity.Organization {
	normalized := normalizeBulkRiskText(unitName)
	for _, org := range orgs {
		if normalizeBulkRiskText(org.Name) == normalized {
			return org
		}
	}
	return nil
}

func normalizeBulkRiskText(value string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(value))), " ")
}

func normalizeBulkRiskCategory(value string) string {
	normalized := normalizeBulkRiskText(value)
	switch normalized {
	case entity.RiskCategoryKebijakan:
		return entity.RiskCategoryKebijakan
	case entity.RiskCategoryOperasional:
		return entity.RiskCategoryOperasional
	case entity.RiskCategoryKepatuhan:
		return entity.RiskCategoryKepatuhan
	case entity.RiskCategoryFraud:
		return entity.RiskCategoryFraud
	case entity.RiskCategoryReputasi:
		return entity.RiskCategoryReputasi
	case "legal":
		return entity.RiskCategoryLegal
	case "fraud - korupsi", "fraud korupsi", "fraud", "korupsi":
		return entity.RiskCategoryFraud
	default:
		return strings.ReplaceAll(normalized, " ", "_")
	}
}

func splitBulkRiskMultiValue(value string) []string {
	parts := strings.FieldsFunc(value, func(r rune) bool { return r == ';' || r == '|' || r == '\n' })
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func parseBulkRiskInt(value string) int {
	parsed, _ := strconv.Atoi(strings.TrimSpace(value))
	return parsed
}

func parseBulkRiskFloat(value string, fallback float64) float64 {
	normalized := strings.ReplaceAll(strings.TrimSpace(value), ",", ".")
	if normalized == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(normalized, 64)
	if err != nil {
		if fallback == -1 {
			return -1
		}
		return fallback
	}
	return parsed
}

type bulkRiskSchedule struct {
	Frequency             string
	RecurringInterval     *string
	DueDate               *string
	ExecutionScheduleText string
}

func parseBulkRiskSchedule(value string) bulkRiskSchedule {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return bulkRiskSchedule{Frequency: "insidental"}
	}
	lower := strings.ToLower(raw)
	if strings.Contains(lower, "hari") {
		interval := "harian"
		return bulkRiskSchedule{Frequency: "rutin", RecurringInterval: &interval, ExecutionScheduleText: raw}
	}
	if strings.Contains(lower, "minggu") {
		interval := "mingguan"
		return bulkRiskSchedule{Frequency: "rutin", RecurringInterval: &interval, ExecutionScheduleText: raw}
	}
	if strings.Contains(lower, "triwulan") || strings.Contains(lower, "quarter") {
		interval := "triwulan"
		return bulkRiskSchedule{Frequency: "rutin", RecurringInterval: &interval, ExecutionScheduleText: raw}
	}
	if strings.Contains(lower, "bulan") {
		interval := "bulanan"
		return bulkRiskSchedule{Frequency: "rutin", RecurringInterval: &interval, ExecutionScheduleText: raw}
	}
	months := []string{"jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"}
	for i, month := range months {
		if strings.Contains(lower, month) {
			if year := regexpYear(lower); year != "" {
				due := fmt.Sprintf("%s-%02d-01", year, i+1)
				return bulkRiskSchedule{Frequency: "insidental", DueDate: &due, ExecutionScheduleText: raw}
			}
		}
	}
	return bulkRiskSchedule{Frequency: "insidental", ExecutionScheduleText: raw}
}

func regexpYear(value string) string {
	for _, field := range strings.FieldsFunc(value, func(r rune) bool { return r < '0' || r > '9' }) {
		if len(field) == 4 && strings.HasPrefix(field, "20") {
			return field
		}
	}
	return ""
}
