package sensitivedata

import (
	"errors"
	"slices"
	"strings"
	"testing"

	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestDetectSensitivePatterns(t *testing.T) {
	tests := []struct {
		name, text string
		category   Category
	}{
		{"identity", "NIK: 3173010101901234", Identity},
		{"bare identity", "3173010101901234", Identity},
		{"spaced identity", "3173 0101 0190 1234", Identity},
		{"aligned identity", "3173   0101   0190   1234", Identity},
		{"employee identity", "198501012010011001", Identity},
		{"tax identity", "NPWP: 12.345.678.9-012.345", Identity},
		{"email", "Hubungi orang@example.test", Email},
		{"mobile", "Hubungi 0812-3456-7890", Phone},
		{"international mobile", "+62 812 3456 7890", Phone},
		{"landline", "021-5551234", Phone},
		{"international landline", "+62 (21) 5551234", Phone},
		{"labelled foreign phone", "Telepon: +1 202 555 0198", Phone},
		{"account", "Nomor rekening: 1234567890", Financial},
		{"account in prose", "Nomor rekening 1234567890", Financial},
		{"health insurance identity", "BPJS: 0001234567890", Identity},
		{"card", "Kartu kredit: 4111 1111 1111 1111", Financial},
		{"patient name", "Nama pasien: Budi Contoh", PersonalRecord},
		{"birth date", "Tanggal lahir: 1990-01-01", PersonalRecord},
		{"patient record", "No. rekam medis: RM-PRIVATE-123", PersonalRecord},
		{"patient table", "Nama pasien | Diagnosis\nBudi Contoh | Temuan medis", PersonalRecord},
		{"home address", "Alamat rumah: Jalan Contoh 1", PersonalRecord},
		{"password", "password: synthetic-secret-7788", Credential},
		{"short password", "Password: abc", Credential},
		{"one-time code", "OTP: 123456", Credential},
		{"card security code", "CVV: 123", Credential},
		{"JSON credential", `{"api_key":"synthetic-secret-7788"}`, Credential},
		{"generic API key", "api_key=synthetic-secret-7788", Credential},
		{"environment password", "DATABASE_PASSWORD=synthetic-secret-7788", Credential},
		{"environment access key", "AWS_SECRET_ACCESS_KEY=synthetic-secret-7788", Credential},
		{"provider key", "sk-proj-SYNTHETIC0123456789abcdefghijkl", Credential},
		{"private key", "-----BEGIN PRIVATE KEY-----", Credential},
		{"bearer", "Authorization: Bearer synthetic-token-7788", Credential},
		{"database credential", "postgres://dummy:syntheticpassword@db.test/database", Credential},
		{"classification", "Klasifikasi: Rahasia", Confidential},
		{"confidential heading", "CONFIDENTIAL\nLaporan internal", Confidential},
		{"zero width email", "orang@exam\u200bple.test", Email},
		{"zero width identity", "31730101\u200b01901234", Identity},
		{"full width identity", "３１７３０１０１０１９０１２３４", Identity},
		{"arabic digits", "٣١٧٣٠١٠١٠١٩٠١٢٣٤", Identity},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if !slices.Contains(Detect(tt.text), tt.category) {
				t.Fatalf("expected category %q", tt.category)
			}
		})
	}
}

func TestDetectAllowsOrdinaryReports(t *testing.T) {
	tests := []struct{ name, text string }{
		{"aggregate health report", "Pada 2026-10-18 terdapat 120 pasien. Cakupan laporan 90%, biaya Rp 1.250.000."},
		{"date range", "Periode 2026-10-01 sampai 2026-12-31."},
		{"risk and task IDs", "R-2026-001 task 72ed67a9-6df4-479e-879f-a5710826ded5"},
		{"technical UUID with phone-like segment", "72ed67a9-6df4-479e-879f-081234567890"},
		{"general privacy policy", "Dokumen tidak boleh memuat informasi rahasia atau data sensitif. Perlindungan identitas pasien wajib dijaga."},
		{"empty patient field", "Nama pasien: \n"},
		{"empty field followed by ordinary text", "Nama pasien:\nPerbaikan layanan telah selesai."},
		{"manually masked fields", "Nama pasien: [disamarkan]\nPassword: ********\nEmail: ***@***.***"},
		{"empty JSON credential", `{"api_key":null}`},
		{"operational date", "Tanggal kejadian: 2026-10-18. Tindak lanjut: perbaiki layanan."},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if len(Detect(tt.text)) != 0 {
				t.Fatal("ordinary report unexpectedly classified as sensitive")
			}
		})
	}
}

func TestValidateNeverReturnsMatchedContent(t *testing.T) {
	const marker = "private-person-7788@example.test"
	for _, source := range []Source{Document, MitigationContext} {
		err := Validate("Email: "+marker, source)
		if !errors.Is(err, domainerrors.ErrSensitiveDataDetected) || !errors.Is(err, domainerrors.ErrInvalidInput) {
			t.Fatal("sensitive-data validation error chain was lost")
		}
		if strings.Contains(err.Error(), marker) || !strings.Contains(err.Error(), "email") {
			t.Fatal("error must contain category only, never its value")
		}
		var appErr *domainerrors.AppError
		if !errors.As(err, &appErr) || appErr.Code != "SENSITIVE_DATA_DETECTED" || appErr.Details != nil {
			t.Fatal("unexpected error metadata")
		}
		if source == MitigationContext && !strings.Contains(err.Error(), "data tugas") {
			t.Fatal("context error must explain how to fix task data")
		}
	}
}
