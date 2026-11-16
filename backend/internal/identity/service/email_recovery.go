package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	"golang.org/x/crypto/bcrypt"
)

const (
	VerifyEmail        = "verify_email"
	ResetByEmail       = "reset_password"
	emailTokenLifetime = 30 * time.Minute
)

var ErrEmailRecoveryBusy = errors.New("email recovery queue is full")
var ErrInvalidEmailToken = errors.New("email link is invalid or expired")

type EmailToken struct {
	Hash, Purpose, Email, PasswordFingerprint string
	UserID                                    uuid.UUID
}

type EmailRecoveryStore interface {
	IssueEmailToken(context.Context, EmailToken, time.Duration) (bool, error)
	UsableResetToken(context.Context, string) (bool, error)
	ConsumeEmailToken(ctx context.Context, hash, purpose, newPasswordHash string) (pendingApproval bool, err error)
}

type EmailSender interface {
	Send(ctx context.Context, recipient, subject, textBody, htmlBody string) error
}

type EmailRecovery struct {
	store  EmailRecoveryStore
	users  Directory
	sender EmailSender
	origin url.URL
	jobs   chan emailJob
}

type emailJob struct {
	nip          string
	verification EmailToken
	registration bool
}

func NewEmailRecovery(store EmailRecoveryStore, users Directory, sender EmailSender, origin string) (*EmailRecovery, error) {
	u, err := url.Parse(origin)
	if err != nil || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" ||
		(u.Path != "" && u.Path != "/") || (u.Scheme != "https" && !(u.Scheme == "http" && isLoopbackHost(u.Hostname()))) {
		return nil, errors.New("AUTH_APP_ORIGIN must be an HTTPS origin, or HTTP loopback for development")
	}
	return &EmailRecovery{store: store, users: users, sender: sender, origin: *u, jobs: make(chan emailJob, 64)}, nil
}

func isLoopbackHost(host string) bool {
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

func (r *EmailRecovery) enqueue(job emailJob) error {
	select {
	case r.jobs <- job:
		return nil
	default:
		return ErrEmailRecoveryBusy
	}
}

func (r *EmailRecovery) RequestReset(nip string) error {
	nip = strings.TrimSpace(nip)
	if nip == "" || len(nip) > 64 {
		return domainerrors.ErrInvalidInput
	}
	// Make the HTTP response independent of directory lookup and SMTP delivery.
	return r.enqueue(emailJob{nip: nip})
}

func (r *EmailRecovery) RequestVerification(ctx context.Context, id uuid.UUID, password string) error {
	u, err := r.users.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if u == nil || !u.CanUseFullSession() {
		return domainerrors.ErrForbidden
	}
	if password == "" || len(password) > 72 || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return domainerrors.ErrInvalidCredentials
	}
	if !domain.ValidEmailAddress(u.Email) {
		return domainerrors.ErrInvalidEmail
	}
	if u.EmailVerified {
		return nil
	}
	return r.queueVerification(u, false)
}

func (r *EmailRecovery) QueueRegistrationVerification(u *domain.User) error {
	return r.queueVerification(u, true)
}

func (r *EmailRecovery) RequestRegistrationVerification(ctx context.Context, nip, password string) error {
	nip = strings.TrimSpace(nip)
	if nip == "" || len(nip) > 64 || password == "" || len(password) > 72 {
		return domainerrors.ErrInvalidInput
	}
	u, err := r.users.GetByNIP(ctx, nip)
	if errors.Is(err, domainerrors.ErrNotFound) {
		return domainerrors.ErrInvalidCredentials
	}
	if err != nil {
		return err
	}
	if u == nil || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return domainerrors.ErrInvalidCredentials
	}
	if !u.IsPendingActivation() || u.EmailVerified {
		return nil
	}
	if !domain.ValidEmailAddress(u.Email) {
		return domainerrors.ErrInvalidEmail
	}
	return r.QueueRegistrationVerification(u)
}

func (r *EmailRecovery) queueVerification(u *domain.User, registration bool) error {
	return r.enqueue(emailJob{registration: registration, verification: EmailToken{
		UserID: u.ID, Purpose: VerifyEmail, Email: u.Email, PasswordFingerprint: fingerprint(u.PasswordHash),
	}})
}

func (r *EmailRecovery) RunWorker(ctx context.Context) {
	for ctx.Err() == nil {
		select {
		case <-ctx.Done():
			return
		case job := <-r.jobs:
			deliveryContext, cancel := context.WithTimeout(ctx, 15*time.Second)
			err := r.deliver(deliveryContext, job)
			cancel()
			if err != nil && ctx.Err() == nil {
				// SMTP errors may contain recipient data. Link tokens never go to logs.
				slog.Warn("identity email delivery failed")
			}
		}
	}
}

func (r *EmailRecovery) deliver(ctx context.Context, job emailJob) error {
	request := job.verification
	if job.nip != "" {
		u, err := r.users.GetByNIP(ctx, job.nip)
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil
		}
		if err != nil {
			return err
		}
		if u == nil || u.Status != domain.UserStatusActive || !u.EmailVerified || !domain.ValidEmailAddress(u.Email) {
			return nil
		}
		request = EmailToken{UserID: u.ID, Purpose: ResetByEmail, Email: u.Email, PasswordFingerprint: fingerprint(u.PasswordHash)}
	}

	var secret [32]byte
	if _, err := rand.Read(secret[:]); err != nil {
		return err
	}
	token := base64.RawURLEncoding.EncodeToString(secret[:])
	request.Hash = fingerprint(token)
	created, err := r.store.IssueEmailToken(ctx, request, emailTokenLifetime)
	if err != nil || !created {
		return err
	}

	link := r.origin
	link.Path = "/reset-password"
	subject := "Reset password Manrisk"
	instruction := "Buka tautan berikut untuk membuat password baru."
	action := "Reset password"
	if request.Purpose == VerifyEmail {
		link.Path = "/verify-email"
		subject = "Verifikasi email Manrisk"
		instruction = "Buka tautan berikut untuk mengonfirmasi email akun Manrisk Anda."
		action = "Verifikasi email"
		if job.registration {
			instruction = "Verifikasi email Anda agar Super Admin dapat meninjau registrasi akun Manrisk Anda."
		}
	}
	link.Fragment = "token=" + token
	const expiryNote = "Tautan berlaku selama 30 menit. Abaikan email ini jika Anda tidak meminta tindakan tersebut."
	textBody := instruction + "\r\n\r\n" + link.String() + "\r\n\r\n" + expiryNote
	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="id">
<body style="margin:0;background-color:#f2f2f2;font-family:Arial,sans-serif;color:#191c21">
	<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" bgcolor="#f2f2f2">
		<tr><td align="center" style="padding:14px 16px 40px">
			<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
			<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="width:100%%;max-width:600px">
				<tr><td style="padding:0 0 34px">
					<table role="presentation" cellspacing="0" cellpadding="0">
						<tr>
							<td width="32"><img src="cid:manrisk-logo@manrisk" width="32" height="32" alt="" style="display:block;border:0"></td>
							<td style="padding-left:8px;font-family:Arial,sans-serif;font-size:24px;line-height:32px;font-weight:700;color:#191c21">Manrisk</td>
						</tr>
					</table>
				</td></tr>
				<tr><td bgcolor="#ffffff" style="padding:40px 36px;border:1px solid #dedee0;font-family:Arial,sans-serif">
					<p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#191c21">%s</p>
					<table role="presentation" cellspacing="0" cellpadding="0">
						<tr><td bgcolor="#191c21" style="border-radius:6px">
							<a href="%s" style="display:inline-block;padding:11px 18px;border:1px solid #191c21;border-radius:6px;font-family:Arial,sans-serif;color:#ffffff;font-size:14px;line-height:20px;font-weight:600;text-decoration:none">%s</a>
						</td></tr>
					</table>
					<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#52525b">%s</p>
				</td></tr>
			</table>
			<!--[if mso]></td></tr></table><![endif]-->
		</td></tr>
	</table>
</body>
</html>`, instruction, html.EscapeString(link.String()), action, expiryNote)
	return r.sender.Send(ctx, request.Email, subject, textBody, htmlBody)
}

func tokenFingerprint(token string) (string, error) {
	if len(token) != base64.RawURLEncoding.EncodedLen(32) {
		return "", ErrInvalidEmailToken
	}
	decoded, err := base64.RawURLEncoding.Strict().DecodeString(token)
	if err != nil || len(decoded) != 32 {
		return "", ErrInvalidEmailToken
	}
	return fingerprint(token), nil
}

func (r *EmailRecovery) Verify(ctx context.Context, token string) (pendingApproval bool, err error) {
	digest, err := tokenFingerprint(token)
	if err != nil {
		return false, err
	}
	return r.store.ConsumeEmailToken(ctx, digest, VerifyEmail, "")
}

func (r *EmailRecovery) Reset(ctx context.Context, token, password, confirmation string) error {
	if utf8.RuneCountInString(password) < 8 || len(password) > 72 || password != confirmation {
		return domainerrors.ErrInvalidInput
	}
	digest, err := tokenFingerprint(token)
	if err != nil {
		return err
	}
	usable, err := r.store.UsableResetToken(ctx, digest)
	if err != nil {
		return err
	}
	if !usable {
		return ErrInvalidEmailToken
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = r.store.ConsumeEmailToken(ctx, digest, ResetByEmail, string(hash))
	return err
}
