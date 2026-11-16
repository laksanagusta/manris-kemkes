package smtp

import (
	"bytes"
	_ "embed"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/textproto"
	"time"
)

//go:embed manrisk-logo.png
var manriskLogoPNG []byte

const (
	textType                = "text/plain; charset=UTF-8"
	htmlType                = "text/html; charset=UTF-8"
	quotedPrintableEncoding = "quoted-printable"
)

func writeMessage(w io.Writer, from, to, subject, textBody, htmlBody string, sentAt time.Time) error {
	const header = "From: Manrisk <%s>\r\nTo: <%s>\r\nSubject: %s\r\nDate: %s\r\nMIME-Version: 1.0\r\n"
	if _, err := fmt.Fprintf(w, header, from, to, subject, sentAt.UTC().Format(time.RFC1123Z)); err != nil {
		return err
	}

	if htmlBody == "" {
		if _, err := fmt.Fprintf(w, "Content-Type: %s\r\nContent-Transfer-Encoding: %s\r\n\r\n", textType, quotedPrintableEncoding); err != nil {
			return err
		}
		return writeQuotedPrintable(w, textBody)
	}

	parts := multipart.NewWriter(w)
	contentType := mime.FormatMediaType("multipart/alternative", map[string]string{"boundary": parts.Boundary()})
	if _, err := fmt.Fprintf(w, "Content-Type: %s\r\n\r\n", contentType); err != nil {
		return err
	}
	if err := writeTextPart(parts, textType, textBody); err != nil {
		return err
	}
	if err := writeBrandedHTML(parts, htmlBody); err != nil {
		return err
	}
	return parts.Close()
}

func writeBrandedHTML(alternatives *multipart.Writer, htmlBody string) error {
	var body bytes.Buffer
	related := multipart.NewWriter(&body)
	if err := writeTextPart(related, htmlType, htmlBody); err != nil {
		return err
	}

	logo, err := related.CreatePart(textproto.MIMEHeader{
		"Content-Type":              {"image/png"},
		"Content-Id":                {"<manrisk-logo@manrisk>"},
		"Content-Disposition":       {"inline"},
		"Content-Transfer-Encoding": {"base64"},
	})
	if err != nil {
		return err
	}
	encoded := base64.StdEncoding.EncodeToString(manriskLogoPNG)
	for len(encoded) > 76 {
		if _, err := io.WriteString(logo, encoded[:76]+"\r\n"); err != nil {
			return err
		}
		encoded = encoded[76:]
	}
	if _, err := io.WriteString(logo, encoded); err != nil {
		return err
	}
	if err := related.Close(); err != nil {
		return err
	}

	part, err := alternatives.CreatePart(textproto.MIMEHeader{
		"Content-Type": {mime.FormatMediaType("multipart/related", map[string]string{
			"boundary": related.Boundary(),
			"type":     "text/html",
		})},
	})
	if err != nil {
		return err
	}
	_, err = body.WriteTo(part)
	return err
}

func writeTextPart(parts *multipart.Writer, mediaType, body string) error {
	writer, err := parts.CreatePart(textproto.MIMEHeader{
		"Content-Type":              {mediaType},
		"Content-Transfer-Encoding": {quotedPrintableEncoding},
	})
	if err != nil {
		return err
	}
	return writeQuotedPrintable(writer, body)
}

func writeQuotedPrintable(w io.Writer, value string) error {
	encoder := quotedprintable.NewWriter(w)
	if _, err := io.WriteString(encoder, value); err != nil {
		return err
	}
	return encoder.Close()
}
