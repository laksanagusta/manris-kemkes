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

var bulkRiskTemplateColumns = []string{
	"Risiko",
	"Deskripsi",
	"Kategori Risiko",
	"Kode Risiko",
	"Sebab",
	"Sumber Risiko",
	"C/UC",
	"Dampak",
	"Pengendalian Uraian",
	"Efektivitas Pengendalian",
	"P",
	"D",
	"Bobot",
	"Prioritas Risiko",
	"Selera Risiko",
	"Pilihan Penanganan Risiko",
	"RPR Uraian",
	"PIC RPR",
	"Jadwal Pelaksanaan",
	"Target P",
	"Target D",
	"Target Bobot",
	"Unit Kerja",
}

var bulkRiskColumnAliases = map[string]string{
	"risiko":                  "Risiko",
	"deskripsi":               "Deskripsi",
	"kategori":                "Kategori Risiko",
	"kategoririsiko":          "Kategori Risiko",
	"koderisiko":              "Kode Risiko",
	"sebab":                   "Sebab",
	"sumberrisiko":            "Sumber Risiko",
	"cuc":                     "C/UC",
	"dampak":                  "Dampak",
	"pengendalianuraian":      "Pengendalian Uraian",
	"efektivitaspengendalian": "Efektivitas Pengendalian",
	"p":                       "P",
	"d":                       "D",
	"bobot":                   "Bobot",
	"prioritasrisiko":         "Prioritas Risiko",
	"selerarisiko":            "Selera Risiko",
	"pilihanpenangananrisiko": "Pilihan Penanganan Risiko",
	"rpruraian":               "RPR Uraian",
	"picrpr":                  "PIC RPR",
	"jadwalpelaksanaan":       "Jadwal Pelaksanaan",
	"targetp":                 "Target P",
	"targetd":                 "Target D",
	"targetbobot":             "Target Bobot",
	"unitkerja":               "Unit Kerja",
}

type BulkRiskSpreadsheetUseCase struct {
	orgRepo  repository.OrganizationRepository
	userRepo repository.UserRepository
}

func NewBulkRiskSpreadsheetUseCase(orgRepo repository.OrganizationRepository, userRepo repository.UserRepository) *BulkRiskSpreadsheetUseCase {
	return &BulkRiskSpreadsheetUseCase{orgRepo: orgRepo, userRepo: userRepo}
}

type BulkRiskSpreadsheetInput struct {
	Filename   string
	Content    []byte
	UploaderID uuid.UUID
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
		result.Items = append(result.Items, mapBulkRiskRecord(record, i+1, orgs, uploader))
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
	if err := f.SetSheetRow(templateSheet, "A1", &bulkRiskTemplateColumns); err != nil {
		return nil, "", err
	}
	if _, err := f.NewSheet("Contoh Data"); err != nil {
		return nil, "", err
	}
	example := []string{"Usulan layanan tidak sesuai kewenangan", "Pengajuan layanan diproses tanpa verifikasi kewenangan yang memadai.", entity.RiskCategoryOperasional, "RPL.01", "Telaah tidak memadai", "Internal", "C", "Pelanggaran aturan", "Telaah UPT", "Efektif", "2", "2", "1.8", "4", "Dalam batas selera risiko", "Menerima risiko", "Checklist kewenangan & review SKI pra-penugasan", "SPI", "Feb 2026", "2", "2", "1.8", "Inspektorat Utama"}
	if err := f.SetSheetRow("Contoh Data", "A1", &bulkRiskTemplateColumns); err != nil {
		return nil, "", err
	}
	if err := f.SetSheetRow("Contoh Data", "A2", &example); err != nil {
		return nil, "", err
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", err
	}
	return buf.Bytes(), "bulk-risk-template.xlsx", nil
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
				return nil, fmt.Errorf("spreadsheet has no sheets")
			}
			preferred = sheets[0]
		}
		rows, err := f.GetRows(preferred)
		if err != nil {
			return nil, apperrors.Wrap(err, "failed to read worksheet")
		}
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

func mapBulkRiskRecord(record map[string]string, rowNumber int, orgs []*entity.Organization, uploader *entity.User) BulkRiskPreviewItem {
	item := CreateRiskBatchItemInput{
		ClientKey:            fmt.Sprintf("row-%d", rowNumber),
		Title:                strings.TrimSpace(record["Risiko"]),
		Description:          strings.TrimSpace(record["Deskripsi"]),
		Category:             normalizeBulkRiskCategory(record["Kategori Risiko"]),
		Cause:                splitBulkRiskMultiValue(record["Sebab"]),
		RiskSource:           strings.TrimSpace(record["Sumber Risiko"]),
		Controllability:      normalizeControllability(record["C/UC"]),
		ImpactDesc:           splitBulkRiskMultiValue(record["Dampak"]),
		ExistingControl:      strings.TrimSpace(record["Pengendalian Uraian"]),
		ControlEffectiveness: normalizeControlEffectiveness(record["Efektivitas Pengendalian"]),
		Probability:          parseBulkRiskInt(record["P"]),
		Impact:               parseBulkRiskInt(record["D"]),
		Weight:               parseBulkRiskFloat(record["Bobot"], 1),
		RiskPriority:         parseBulkRiskInt(record["Prioritas Risiko"]),
		RiskAppetite:         strings.TrimSpace(record["Selera Risiko"]),
		TreatmentOption:      normalizeTreatmentOption(record["Pilihan Penanganan Risiko"]),
		TargetProbability:    parseBulkRiskInt(record["Target P"]),
		TargetImpact:         parseBulkRiskInt(record["Target D"]),
		TargetWeight:         parseBulkRiskFloat(record["Target Bobot"], 1),
	}
	schedule := parseBulkRiskSchedule(record["Jadwal Pelaksanaan"])
	if action := strings.TrimSpace(record["RPR Uraian"]); action != "" {
		item.Mitigations = []entity.Mitigation{{
			Action:                action,
			Owner:                 strings.TrimSpace(record["PIC RPR"]),
			Frequency:             schedule.Frequency,
			RecurringInterval:     schedule.RecurringInterval,
			DueDate:               schedule.DueDate,
			ExecutionScheduleText: schedule.ExecutionScheduleText,
		}}
	}

	errors := []string{}
	warnings := []string{}
	fallbackOrgID := (*uuid.UUID)(nil)
	if uploader != nil && uploader.Role == "unit" {
		fallbackOrgID = uploader.OrganizationID
	}
	if fallbackOrgID != nil {
		item.OrganizationID = fallbackOrgID
	} else {
		unitName := strings.TrimSpace(record["Unit Kerja"])
		if unitName == "" {
			errors = append(errors, "Kolom Unit Kerja wajib diisi untuk user non-unit.")
		} else if org := matchBulkRiskOrganization(orgs, unitName); org != nil {
			item.OrganizationID = &org.ID
		} else {
			errors = append(errors, fmt.Sprintf("Unit kerja '%s' tidak ditemukan.", unitName))
		}
	}
	if item.Title == "" {
		errors = append(errors, "Kolom Risiko wajib diisi.")
	}
	if item.Description == "" {
		errors = append(errors, "Kolom Deskripsi wajib diisi.")
	}
	if strings.TrimSpace(record["Kategori Risiko"]) == "" {
		errors = append(errors, "Kolom Kategori Risiko wajib diisi.")
	} else if !entity.IsValidRiskCategory(item.Category) {
		errors = append(errors, "Kategori Risiko tidak valid. Gunakan: strategis, operasional, kepatuhan, finansial, reputasi, teknologi_informasi.")
	}
	if item.Controllability == "" {
		errors = append(errors, "Kolom C/UC harus berisi C atau UC.")
	}
	if item.Probability < 1 || item.Probability > 5 {
		errors = append(errors, "Kolom P harus angka 1-5.")
	}
	if item.Impact < 1 || item.Impact > 5 {
		errors = append(errors, "Kolom D harus angka 1-5.")
	}
	if item.TargetProbability < 1 || item.TargetProbability > 5 {
		errors = append(errors, "Kolom Target P harus angka 1-5.")
	}
	if item.TargetImpact < 1 || item.TargetImpact > 5 {
		errors = append(errors, "Kolom Target D harus angka 1-5.")
	}
	if action := strings.TrimSpace(record["RPR Uraian"]); action != "" && strings.TrimSpace(record["PIC RPR"]) == "" {
		errors = append(errors, "Kolom PIC RPR wajib diisi jika RPR Uraian diisi.")
	}
	if strings.TrimSpace(record["Pilihan Penanganan Risiko"]) != "" && item.TreatmentOption == "" {
		errors = append(errors, "Pilihan Penanganan Risiko tidak dikenali.")
	}
	if strings.TrimSpace(record["Efektivitas Pengendalian"]) != "" && item.ControlEffectiveness == "" {
		errors = append(errors, "Efektivitas Pengendalian harus Efektif atau Tidak Efektif.")
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
	case entity.RiskCategoryStrategis:
		return entity.RiskCategoryStrategis
	case entity.RiskCategoryOperasional:
		return entity.RiskCategoryOperasional
	case entity.RiskCategoryKepatuhan:
		return entity.RiskCategoryKepatuhan
	case entity.RiskCategoryFinansial:
		return entity.RiskCategoryFinansial
	case entity.RiskCategoryReputasi:
		return entity.RiskCategoryReputasi
	case "teknologi informasi", "teknologi_informasi", "ti":
		return entity.RiskCategoryTeknologiInformasi
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
		return -1
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
