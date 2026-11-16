package risk

import (
	"fmt"

	"github.com/xuri/excelize/v2"
)

func writeBulkRiskColumnGuide(f *excelize.File, example []string) error {
	const sheet = "Panduan Kolom"
	if _, err := f.NewSheet(sheet); err != nil {
		return err
	}

	headerStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: "Bookman Old Style", Size: 11, Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"E3E3E3"}},
		Alignment: &excelize.Alignment{Vertical: "center", WrapText: true},
	})
	if err != nil {
		return err
	}
	bodyStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: "Bookman Old Style", Size: 11},
		Alignment: &excelize.Alignment{Vertical: "center", WrapText: true},
	})
	if err != nil {
		return err
	}

	instruction := "Salin nilai dari file Anda ke kolom yang sesuai di Template Upload mulai baris 5. " +
		"Isi kolom wajib dan kosongkan kolom bertanda Diisi sistem."
	if err := f.MergeCell(sheet, "A1", "E1"); err != nil {
		return err
	}
	if err := f.SetCellValue(sheet, "A1", instruction); err != nil {
		return err
	}
	headers := []string{"Kolom", "Nama", "Pengisian", "Nilai atau format", "Contoh"}
	if err := f.SetSheetRow(sheet, "A3", &headers); err != nil {
		return err
	}
	for index, width := range []float64{9, 26, 16, 61, 36} {
		column, _ := excelize.ColumnNumberToName(index + 1)
		if err := f.SetColWidth(sheet, column, column, width); err != nil {
			return err
		}
	}
	if err := f.SetCellStyle(sheet, "A3", "E3", headerStyle); err != nil {
		return err
	}
	if err := f.SetCellStyle(sheet, "A1", "E1", bodyStyle); err != nil {
		return err
	}
	if err := f.SetRowHeight(sheet, 1, 34); err != nil {
		return err
	}
	if err := f.SetRowHeight(sheet, 3, 24); err != nil {
		return err
	}

	for index, name := range bulkRiskTemplateColumns {
		rule, found := bulkRiskGuideRules[name]
		status, format, sample := rule.status, rule.format, example[index]
		if bulkRiskComputedColumns[name] {
			status, format, sample = "Diisi sistem", "Biarkan kosong.", "—"
		} else if !found {
			return fmt.Errorf("panduan pengisian untuk kolom %q belum tersedia", name)
		}
		if name == "TIDAK EFEKTIF" {
			sample = "Ya"
		}
		column, _ := excelize.ColumnNumberToName(index + 1)
		rowNumber := index + 4
		row := []string{column, name, status, format, sample}
		if err := f.SetSheetRow(sheet, fmt.Sprintf("A%d", rowNumber), &row); err != nil {
			return err
		}
		if err := f.SetRowHeight(sheet, rowNumber, 36); err != nil {
			return err
		}
	}
	if err := f.SetCellStyle(sheet, "A4", fmt.Sprintf("E%d", len(bulkRiskTemplateColumns)+3), bodyStyle); err != nil {
		return err
	}
	return f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		YSplit:      3,
		TopLeftCell: "A4",
		ActivePane:  "bottomLeft",
	})
}

var bulkRiskGuideRules = map[string]struct {
	status string
	format string
}{
	"RISIKO":               {"Wajib", "Teks yang menjelaskan peristiwa risiko."},
	bulkRiskCategoryColumn: {"Wajib", bulkRiskCategoryChoices},
	"SEBAB":                {"Opsional", "Teks. Pisahkan beberapa sebab dengan titik koma atau baris baru."},
	"SUMBER RISIKO":        {"Opsional", "Internal atau Eksternal."},
	"C/UC":                 {"Wajib", "C jika dapat dikendalikan, UC jika tidak dapat dikendalikan."},
	"DAMPAK":               {"Opsional", "Teks. Pisahkan beberapa dampak dengan titik koma atau baris baru."},
	"URAIAN":               {"Opsional", "Teks yang menjelaskan pengendalian yang sudah ada."},
	"EFEKTIF":              {"Opsional", "Isi Ya jika efektif. Kosongkan kolom Tidak Efektif."},
	"TIDAK EFEKTIF":        {"Opsional", "Isi Ya jika tidak efektif. Kosongkan kolom Efektif."},
	"P":                    {"Wajib", "Angka bulat 1–5 untuk probabilitas."},
	"D":                    {"Wajib", "Angka bulat 1–5 untuk dampak."},
	"SELERA RISIKO":        {"Opsional", "Teks yang menjelaskan apakah risiko berada dalam batas selera risiko."},
	"PILIHAN PENANGANAN":   {"Opsional", bulkRiskTreatmentChoices},
	"URAIAN (RPR)":         {"Opsional", "Teks yang menjelaskan tindakan yang direncanakan."},
	"JADWAL PELAKSANAAN":   {"Opsional", "Bulan dan tahun atau frekuensi seperti Mingguan. Isi bersama Uraian (RPR)."},
	"P (target)":           {"Opsional", "Angka bulat 1–5 untuk target probabilitas."},
	"D (target)":           {"Opsional", "Angka bulat 1–5 untuk target dampak."},
}
