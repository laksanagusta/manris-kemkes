// Package qrcode provides QR code generation utilities for document signing.
package qrcode

import (
	"encoding/base64"
	"encoding/json"
	"time"

	goqrcode "github.com/skip2/go-qrcode"
)

// QRPayload represents the data encoded in a QR code for a signed document.
type QRPayload struct {
	WorkingPaperID    string    `json:"working_paper_id"`
	WorkingPaperTitle string    `json:"working_paper_title"`
	DocumentHash      string    `json:"document_hash"`
	SignerName        string    `json:"signer_name"`
	SignerNIP         string    `json:"signer_nip"`
	SignerJabatan     string    `json:"signer_jabatan"`
	SignerPangkat     string    `json:"signer_pangkat"`
	SignedAt          time.Time `json:"signed_at"`
}

// GenerateQRCode creates a QR code from a QRPayload and returns it as a base64-encoded PNG.
func GenerateQRCode(payload QRPayload) (string, error) {
	// Serialize payload to compact JSON
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	// Generate QR code as PNG bytes using goqrcode
	// Medium recovery level, 256x256 size
	pngBytes, err := goqrcode.Encode(string(jsonData), goqrcode.Medium, 256)
	if err != nil {
		return "", err
	}

	// Base64-encode the PNG bytes
	base64PNG := base64.StdEncoding.EncodeToString(pngBytes)
	return base64PNG, nil
}
