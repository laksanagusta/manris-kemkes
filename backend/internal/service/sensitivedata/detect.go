// Package sensitivedata detects supported sensitive-data patterns locally.
// It returns categories only: matched values must never enter errors or logs.
package sensitivedata

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type Source uint8

const (
	Document Source = iota
	MitigationContext
	AIInput
)

type Category string

const (
	Identity       Category = "nomor identitas"
	Email          Category = "email"
	Phone          Category = "nomor telepon"
	Financial      Category = "rekening atau kartu"
	PersonalRecord Category = "identitas pribadi atau pasien"
	Credential     Category = "kredensial akses"
	Confidential   Category = "penanda kerahasiaan"
)

var (
	technicalUUID    = regexp.MustCompile(`(?i)\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b`)
	identityNumber   = regexp.MustCompile(`(?:[0-9]{18}|[0-9]{16}|[0-9]{4}(?:[ -]+[0-9]{4}){3})`)
	labelledIdentity = regexp.MustCompile(`(?i)\b(?:nik|nip|npwp|bpjs|kis|nomor\s+(?:ktp|paspor|bpjs|kis|kk)|no\.?\s*(?:ktp|paspor|bpjs|kis|kk))\s*[:=#-]?\s*[0-9](?:[ .-]*[0-9]){7,19}`)
	emailAddress     = regexp.MustCompile(`[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}.\-]+\.[\p{L}]{2,}`)
	phoneNumber      = regexp.MustCompile(`(?:\+?62|0)[ .()-]*(?:8(?:[ .()-]*[0-9]){8,11}|[2-7][0-9](?:[ .()-]*[0-9]){6,9})`)
	labelledPhone    = regexp.MustCompile(`(?i)\b(?:telepon|telp\.?|ponsel|handphone|phone|whatsapp|no\.?\s*(?:hp|wa))\s*[:=#-]\s*\+?[0-9](?:[ .()-]?[0-9]){7,14}`)
	financialNumber  = regexp.MustCompile(`(?i)\b(?:(?:nomor|no\.?)\s+)?(?:rekening|rek\.?|kartu\s+(?:kredit|debit)|credit\s*card|bank\s*account)\s*[:=#-]?\s*[0-9](?:[ .-]*[0-9]){5,23}`)
	personalField    = regexp.MustCompile(`(?im)\b(?:nama\s+(?:lengkap|pasien|penderita|korban|pelapor|saksi)|patient\s*name|alamat\s+(?:rumah|domisili|pasien)|(?:tanggal|tempat)\s+lahir|(?:nomor|no\.?)\s*rekam\s*medis|diagnosis\s+pasien)["']?[ \t]*[:=][ \t]*([^\n\r|;]+)`)
	patientTable     = regexp.MustCompile(`(?i)\b(?:nama\s+pasien|patient\s*name|(?:nomor|no\.?)\s*rekam\s*medis|diagnosis\s+pasien)\s*\|`)
	credentialField  = regexp.MustCompile(`(?im)\b(?:[a-z0-9]+[_-])*(?:api[_ -]?key|client[_ -]?secret|access[_ -]?(?:token|key)|refresh[_ -]?token|password|passwd|kata\s+sandi|secret[_ -]?key|secret|token|otp|kode\s+otp|pin|cvv|cvc)["']?[ \t]*[:=][ \t]*["']?([^\s"';|,}\]]+)`)
	credentialToken  = regexp.MustCompile(`(?i)\bsk-(?:proj-|svcacct-)?[a-z0-9_-]{16,}|\bAKIA[A-Z0-9]{16}\b|-----BEGIN (?:ENCRYPTED |RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|\bauthorization\s*[:=]\s*bearer\s+[a-z0-9._~+/=-]{8,}|\beyJ[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}|\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?)://[^/\s:@]+:[^/\s@]+@`)
	confidentialMark = regexp.MustCompile(`(?im)^\s*(?:(?:sifat|klasifikasi|classification|tingkat\s+kerahasiaan)\s*[:=-]\s*(?:sangat\s+rahasia|rahasia|confidential|restricted)\b|(?:sangat\s+rahasia|rahasia|confidential|strictly\s+confidential|restricted)\s*$)`)
)

// Detect performs deterministic pattern checks, not semantic classification.
// Normalization is used only for detection; the source is never rewritten.
func Detect(text string) []Category {
	text = normalize(text)
	numericText := technicalUUID.ReplaceAllString(text, " ")
	categories := make([]Category, 0, 7)
	if boundedMatch(identityNumber, numericText) || labelledIdentity.MatchString(text) {
		categories = append(categories, Identity)
	}
	if emailAddress.MatchString(text) {
		categories = append(categories, Email)
	}
	if boundedMatch(phoneNumber, numericText) || labelledPhone.MatchString(text) {
		categories = append(categories, Phone)
	}
	if financialNumber.MatchString(text) {
		categories = append(categories, Financial)
	}
	if hasFieldValue(personalField, text) || patientTable.MatchString(text) {
		categories = append(categories, PersonalRecord)
	}
	if hasFieldValue(credentialField, text) || credentialToken.MatchString(text) {
		categories = append(categories, Credential)
	}
	if confidentialMark.MatchString(text) {
		categories = append(categories, Confidential)
	}
	return categories
}

// Validate returns an actionable error containing fixed category names only.
func Validate(text string, source Source) error {
	return validationError(Detect(text), source)
}

// ValidateAIInput checks individual fields before formatting or JSON encoding.
func ValidateAIInput(fields ...string) error {
	return validateFields(fields, AIInput)
}

func validateFields(fields []string, source Source) error {
	found := make(map[Category]bool)
	for _, field := range fields {
		for _, category := range Detect(field) {
			found[category] = true
		}
	}
	categories := make([]Category, 0, len(found))
	for _, category := range []Category{Identity, Email, Phone, Financial, PersonalRecord, Credential, Confidential} {
		if found[category] {
			categories = append(categories, category)
		}
	}
	return validationError(categories, source)
}

func validationError(categories []Category, source Source) error {
	if len(categories) == 0 {
		return nil
	}
	labels := make([]string, len(categories))
	for i, category := range categories {
		labels[i] = string(category)
	}
	message := "Dokumen terindikasi memuat data sensitif (" + strings.Join(labels, ", ") + "). Hapus data tersebut dari dokumen, lalu unggah kembali."
	if source == MitigationContext {
		message = "Konteks tugas mitigasi terindikasi memuat data sensitif (" + strings.Join(labels, ", ") + "). Periksa data tugas atau persempit cakupan, lalu coba lagi."
	}
	if source == AIInput {
		message = "Permintaan AI terindikasi memuat data sensitif (" + strings.Join(labels, ", ") + "). Periksa masukan dan data konteks yang digunakan, hapus data sensitif, lalu coba lagi."
	}
	return &domainerrors.AppError{
		Code:    domainerrors.ErrSensitiveDataDetected.Code,
		Message: message,
		Err:     domainerrors.ErrSensitiveDataDetected,
	}
}

func hasFieldValue(pattern *regexp.Regexp, text string) bool {
	for _, match := range pattern.FindAllStringSubmatch(text, -1) {
		value := strings.TrimSpace(match[1])
		if strings.EqualFold(value, "anonim") || strings.EqualFold(value, "[redacted]") || strings.EqualFold(value, "[disamarkan]") || strings.EqualFold(value, "null") || strings.EqualFold(value, "n/a") {
			continue
		}
		for _, char := range value {
			if unicode.IsLetter(char) || unicode.IsDigit(char) {
				return true
			}
		}
	}
	return false
}

func boundedMatch(pattern *regexp.Regexp, text string) bool {
	for _, span := range pattern.FindAllStringIndex(text, -1) {
		if span[0] > 0 {
			previous, _ := utf8.DecodeLastRuneInString(text[:span[0]])
			if unicode.IsLetter(previous) || unicode.IsDigit(previous) {
				continue
			}
		}
		if span[1] < len(text) {
			next, _ := utf8.DecodeRuneInString(text[span[1]:])
			if unicode.IsLetter(next) || unicode.IsDigit(next) {
				continue
			}
		}
		return true
	}
	return false
}

func normalize(text string) string {
	return strings.Map(func(char rune) rune {
		switch char {
		case '\u00ad', '\u200b', '\u200c', '\u200d', '\u200e', '\u200f', '\u2060', '\ufeff':
			return -1
		}
		if (char >= '\u202a' && char <= '\u202e') || (char >= '\u2066' && char <= '\u2069') {
			return -1
		}
		if char >= '\uff01' && char <= '\uff5e' {
			return char - 0xfee0
		}
		for _, zero := range []rune{'\u0660', '\u06f0', '\u0966', '\u09e6', '\u0e50'} {
			if char >= zero && char <= zero+9 {
				return '0' + char - zero
			}
		}
		if unicode.IsSpace(char) && char != '\n' && char != '\r' {
			return ' '
		}
		return char
	}, text)
}
