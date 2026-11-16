package smtp

import (
	"bytes"
	"encoding/base64"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"testing"
	"time"
)

func TestWriteMessageIncludesTextAndBrandedHTMLAlternatives(t *testing.T) {
	const link = "https://manrisk.example/reset-password#token=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	const textBody = "Buka tautan reset:\r\n" + link
	const htmlBody = `<img src="cid:manrisk-logo@manrisk" alt="Manrisk"><a href="` + link + `">Reset password</a>`
	var wire bytes.Buffer
	err := writeMessage(&wire, "sender@example.test", "recipient@example.test", "Reset password Manrisk", textBody, htmlBody, time.Unix(0, 0))
	if err != nil {
		t.Fatal(err)
	}
	message, err := mail.ReadMessage(&wire)
	if err != nil {
		t.Fatal(err)
	}
	mediaType, params, err := mime.ParseMediaType(message.Header.Get("Content-Type"))
	if err != nil || mediaType != "multipart/alternative" || params["boundary"] == "" {
		t.Fatalf("unexpected email content type: %q (%v)", mediaType, err)
	}
	alternatives := multipart.NewReader(message.Body, params["boundary"])
	assertTextPart(t, alternatives, "text/plain", textBody)

	htmlPart, err := alternatives.NextPart()
	if err != nil {
		t.Fatal(err)
	}
	mediaType, params, err = mime.ParseMediaType(htmlPart.Header.Get("Content-Type"))
	if err != nil || mediaType != "multipart/related" || params["type"] != "text/html" || params["boundary"] == "" {
		t.Fatalf("unexpected HTML alternative content type: %q (%v)", mediaType, err)
	}
	related := multipart.NewReader(htmlPart, params["boundary"])
	assertTextPart(t, related, "text/html", htmlBody)

	logo, err := related.NextPart()
	if err != nil {
		t.Fatal(err)
	}
	if logo.Header.Get("Content-Type") != "image/png" || logo.Header.Get("Content-Disposition") != "inline" ||
		logo.Header.Get("Content-Transfer-Encoding") != "base64" || logo.Header.Get("Content-ID") != "<manrisk-logo@manrisk>" {
		t.Fatal("expected an inline PNG with the content ID referenced in the HTML")
	}
	decoded, err := io.ReadAll(base64.NewDecoder(base64.StdEncoding, logo))
	if err != nil || !bytes.Equal(decoded, manriskLogoPNG) {
		t.Fatalf("logo did not round-trip: %v", err)
	}
	if _, err := related.NextPart(); !errors.Is(err, io.EOF) {
		t.Fatalf("expected end of inline image parts, got %v", err)
	}
	if _, err := alternatives.NextPart(); !errors.Is(err, io.EOF) {
		t.Fatalf("expected end of MIME alternatives, got %v", err)
	}
}

func assertTextPart(t *testing.T, parts *multipart.Reader, mediaType, want string) {
	t.Helper()
	part, err := parts.NextPart()
	if err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(part)
	if err != nil || !strings.HasPrefix(part.Header.Get("Content-Type"), mediaType+";") || string(body) != want {
		t.Fatalf("MIME part did not round-trip as %s: %v", mediaType, err)
	}
}
