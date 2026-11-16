//go:build integration

package postgres_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http/httptest"
	"net/textproto"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	identityhttp "github.com/manris/backend/internal/handler/http"
	"github.com/manris/backend/internal/identity/domain"
	identity "github.com/manris/backend/internal/identity/service"
	"github.com/manris/backend/internal/repository/postgres"
	authuc "github.com/manris/backend/internal/usecase/auth"
	useruc "github.com/manris/backend/internal/usecase/user"
)

type recoveryEmail struct {
	to, subject, textBody, htmlBody string
}

type testRecoveryMailer chan recoveryEmail

func (m testRecoveryMailer) Send(_ context.Context, to, subject, textBody, htmlBody string) error {
	m <- recoveryEmail{to: to, subject: subject, textBody: textBody, htmlBody: htmlBody}
	return nil
}

type temporarilyUnavailableMailer struct {
	testRecoveryMailer
	recipient string
	failFirst sync.Once
}

func (m *temporarilyUnavailableMailer) Send(ctx context.Context, to, subject, textBody, htmlBody string) error {
	if to == m.recipient {
		var failure error
		m.failFirst.Do(func() { failure = &textproto.Error{Code: 451, Msg: "test temporary failure"} })
		if failure != nil {
			return failure
		}
	}
	return m.testRecoveryMailer.Send(ctx, to, subject, textBody, htmlBody)
}

func (m testRecoveryMailer) receive(t *testing.T, subject, to string) recoveryEmail {
	t.Helper()
	select {
	case email := <-m:
		if email.subject != subject || email.to != to {
			t.Fatalf("unexpected email recipient or subject: %q %q", email.to, email.subject)
		}
		return email
	case <-time.After(3 * time.Second):
		t.Fatal("timed out waiting for recovery email")
		return recoveryEmail{}
	}
}

func recoveryLinkToken(t *testing.T, email recoveryEmail, path string) string {
	t.Helper()
	lines := strings.Split(email.textBody, "\r\n")
	if len(lines) < 3 {
		t.Fatal("missing email link")
	}
	link, err := url.Parse(lines[2])
	if err != nil || link.Scheme != "https" || link.Host != "manrisk.example" || link.Path != path || link.RawQuery != "" {
		t.Fatal("unexpected recovery link destination")
	}
	if path == "/reset-password" && (!strings.Contains(email.htmlBody, `href="`+html.EscapeString(link.String())+`"`) ||
		!strings.Contains(email.htmlBody, ">Reset password</a>")) {
		t.Fatal("reset email is missing a button linked to the same reset URL")
	}
	if path == "/verify-email" && (!strings.Contains(email.htmlBody, `href="`+html.EscapeString(link.String())+`"`) ||
		!strings.Contains(email.htmlBody, ">Verifikasi email</a>")) {
		t.Fatal("verification button must use the same link as the plain-text email")
	}
	if !strings.Contains(email.htmlBody, `src="cid:manrisk-logo@manrisk"`) {
		t.Fatal("missing Manrisk logo in email")
	}
	fragment, err := url.ParseQuery(link.Fragment)
	if err != nil || len(fragment.Get("token")) != 43 {
		t.Fatal("invalid token fragment")
	}
	return fragment.Get("token")
}

func testEmailRecoveryLifecycle(t *testing.T, pool *pgxpool.Pool, auth *identity.Service, orgID uuid.UUID, oldHash string) {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	const recipient = "email-recovery@example.test"
	const nip = "789"
	const oldPassword = "Password123!"
	const newPassword = "PasswordBaru123!"
	const registrationNIP = "78910"
	const registeredEmail = "registrasi@example.test"
	userID := uuid.New()
	_, err := pool.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,status,must_change_password,nip,jabatan,pangkat,phone_number,organization_id)
		VALUES($1,'Email Recovery','email-recovery',$2,$3,'unit','active',FALSE,$4,'','','',$5)`, userID, recipient, oldHash, nip, orgID)
	if err != nil {
		t.Fatal(err)
	}
	appKey, err := identity.NewAppKey()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE auth_applications SET key_hash=$1 WHERE id='manris'`, fmt.Sprintf("%x", sha256.Sum256([]byte(appKey)))); err != nil {
		t.Fatal(err)
	}

	mailbox := make(testRecoveryMailer, 8)
	directory := postgres.NewIdentityDirectory(pool)
	sender := &temporarilyUnavailableMailer{testRecoveryMailer: mailbox, recipient: registeredEmail}
	recovery, err := identity.NewEmailRecovery(postgres.NewIdentityAuthStore(pool), directory, sender, "https://manrisk.example")
	if err != nil {
		t.Fatal(err)
	}
	workerDone := make(chan struct{})
	go func() {
		defer close(workerDone)
		recovery.RunWorker(ctx)
	}()
	defer func() { cancel(); <-workerDone }()

	app := fiber.New()
	api := app.Group("/api/v1")
	identityhttp.NewIdentityAuthHandler(auth, true).RegisterPublicRoutes(api)
	identityhttp.RegisterEmailRecoveryRoutes(api, auth, recovery)
	users := postgres.NewUserRepository(pool)
	registration := authuc.NewRegisterUseCase(users, postgres.NewOrganizationRepository(pool), postgres.NewIdentityAuthStore(pool))
	identityhttp.NewAuthHandler(nil, registration, nil, nil, nil).RegisterPublicRegistrationRoutes(api, func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
	request := func(method, path, session string, body any, want int) string {
		t.Helper()
		content, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(method, "/api/v1/auth/"+path, bytes.NewReader(content))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-App-Key", appKey)
		if session != "" {
			req.Header.Set("Authorization", "Bearer "+session)
		}
		resp, err := app.Test(req, 4000)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != want || resp.Header.Get("Cache-Control") != "no-store" {
			t.Fatalf("%s returned status %d (want %d): %s", path, resp.StatusCode, want, data)
		}
		return string(data)
	}
	post := func(path, session string, body map[string]string, want int) string {
		t.Helper()
		return request("POST", path, session, body, want)
	}

	result := post("register", "", map[string]string{
		"nip": registrationNIP, "name": "Calon pengguna", "email": registeredEmail, "organizationId": orgID.String(),
		"password": oldPassword, "confirmPassword": oldPassword,
	}, 201)
	var registrationResult struct {
		Data struct {
			VerificationQueued     bool      `json:"verificationQueued"`
			VerificationDeliveryID uuid.UUID `json:"verificationDeliveryId"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(result), &registrationResult); err != nil ||
		!registrationResult.Data.VerificationQueued || registrationResult.Data.VerificationDeliveryID == uuid.Nil {
		t.Fatal("registration did not return a verification delivery receipt", err)
	}
	receipt := registrationResult.Data.VerificationDeliveryID.String()
	registered, err := users.GetByNIP(ctx, registrationNIP)
	if err != nil {
		t.Fatal(err)
	}
	approve := useruc.NewApproveRegistrationUseCase(users)
	login := map[string]string{"nip": registrationNIP, "password": oldPassword}
	lookup := request("POST", "verify-email/resend-registration", "", map[string]any{
		"nip": registrationNIP, "password": oldPassword, "statusOnly": true,
	}, 202)
	if !strings.Contains(lookup, receipt) || strings.Contains(lookup, "outcome") {
		t.Fatal("applicant could not recover the original receipt")
	}
	request("GET", "verify-email/delivery/"+uuid.NewString(), "", nil, 404)
	request("GET", "verify-email/admin/"+registered.ID.String(), "", nil, 401)
	admin, err := auth.Login(ctx, domain.ManrisApplication, "123", oldPassword)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(post("login", "", login, 403), "EMAIL_VERIFICATION_REQUIRED") {
		t.Fatal("login did not identify the missing verification")
	}
	if _, err := approve.Execute(ctx, registered.ID); !errors.Is(err, domainerrors.ErrEmailVerificationRequired) {
		t.Fatalf("unverified registration can be approved: %v", err)
	}
	waitForDelivery := func(status string) {
		t.Helper()
		deadline := time.Now().Add(3 * time.Second)
		for {
			result := request("GET", "verify-email/delivery/"+receipt, "", nil, 200)
			if strings.Contains(result, `"status":"`+status+`"`) {
				if strings.Contains(result, "failure") {
					t.Fatal("receipt disclosed internal failure details")
				}
				return
			}
			if time.Now().After(deadline) {
				t.Fatalf("delivery did not reach state %q: %s", status, result)
			}
			time.Sleep(50 * time.Millisecond)
		}
	}
	waitForDelivery("retrying")
	adminStatus := request("GET", "verify-email/admin/"+registered.ID.String(), admin.Token, nil, 200)
	if !strings.Contains(adminStatus, `"failure":"temporary"`) {
		t.Fatal("admin did not receive the sanitized failure category")
	}
	if _, err := pool.Exec(ctx, `UPDATE auth_verification_deliveries SET available_at=NOW() WHERE id=$1`, receipt); err != nil {
		t.Fatal(err)
	}
	expiredRegistration := recoveryLinkToken(t, mailbox.receive(t, "Verifikasi email Manrisk", registeredEmail), "/verify-email")
	waitForDelivery("accepted")
	duringCooldown := post("verify-email/resend-registration", "", login, 202)
	if !strings.Contains(duringCooldown, receipt) || !strings.Contains(duringCooldown, `"outcome":"cooldown"`) ||
		!strings.Contains(duringCooldown, `"retryAt":`) {
		t.Fatalf("resend did not return the cooldown and previous receipt: %s", duringCooldown)
	}
	adminRetry := post("verify-email/admin/"+registered.ID.String()+"/retry", admin.Token, nil, 200)
	if !strings.Contains(adminRetry, `"outcome":"cooldown"`) || !strings.Contains(adminRetry, `"retryAt":`) ||
		!strings.Contains(adminRetry, `"status":"accepted"`) {
		t.Fatalf("administrator retry did not return the same cooldown and delivery state: %s", adminRetry)
	}
	if _, err := pool.Exec(ctx, `UPDATE auth_email_tokens SET expires_at=NOW()-interval '1 second' WHERE user_id=$1`, registered.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE auth_verification_deliveries SET updated_at=NOW()-interval '31 minutes' WHERE id=$1`, receipt); err != nil {
		t.Fatal(err)
	}
	post("verify-email/confirm", "", map[string]string{"token": expiredRegistration}, 422)
	post("verify-email/resend-registration", "", map[string]string{"nip": registrationNIP, "password": "wrong"}, 422)
	adminRetry = post("verify-email/admin/"+registered.ID.String()+"/retry", admin.Token, nil, 200)
	if !strings.Contains(adminRetry, `"outcome":"scheduled"`) || !strings.Contains(adminRetry, `"status":"queued"`) {
		t.Fatalf("administrator retry did not return the newly queued delivery: %s", adminRetry)
	}
	if result := post("verify-email/resend-registration", "", login, 202); !strings.Contains(result, "deliveryId") {
		t.Fatal("resend did not return a receipt")
	}
	registeredToken := recoveryLinkToken(t, mailbox.receive(t, "Verifikasi email Manrisk", registeredEmail), "/verify-email")
	if !strings.Contains(post("verify-email/confirm", "", map[string]string{"token": registeredToken}, 200), `"pendingApproval":true`) {
		t.Fatal("verification did not leave the account pending approval")
	}
	post("verify-email/confirm", "", map[string]string{"token": registeredToken}, 422)
	post("login", "", login, 403)
	if _, err := approve.Execute(ctx, registered.ID); err != nil {
		t.Fatalf("approve verified registration: %v", err)
	}
	post("login", "", login, 200)

	// Unknown, unverified, and verified NIPs get the same public acknowledgement.
	unknown := post("forgot-password", "", map[string]string{"nip": "unknown"}, 202)
	unverified := post("forgot-password", "", map[string]string{"nip": nip}, 202)
	if unknown != unverified {
		t.Fatal("public response discloses unverified account")
	}
	session, err := auth.Login(ctx, domain.ManrisApplication, nip, oldPassword)
	if err != nil {
		t.Fatal(err)
	}
	request("GET", "verify-email/admin/"+registered.ID.String(), session.Token, nil, 403)
	external, err := auth.Login(ctx, "recovery_test", nip, oldPassword)
	if err != nil {
		t.Fatal(err)
	}
	post("verify-email/request", "", map[string]string{"currentPassword": oldPassword}, 401)
	post("verify-email/request", session.Token, map[string]string{"currentPassword": "wrong"}, 422)
	post("verify-email/request", session.Token, map[string]string{"currentPassword": oldPassword}, 202)
	verifyToken := recoveryLinkToken(t, mailbox.receive(t, "Verifikasi email Manrisk", recipient), "/verify-email")
	post("reset-password", "", map[string]string{"token": verifyToken, "newPassword": newPassword, "confirmPassword": newPassword}, 422)
	post("verify-email/confirm", "", map[string]string{"token": verifyToken}, 204)
	post("verify-email/confirm", "", map[string]string{"token": verifyToken}, 422)
	profile, err := auth.Validate(ctx, domain.ManrisApplication, session.Token)
	if err != nil || !profile.Profile.EmailVerified {
		t.Fatalf("verification absent from authenticated profile: %v", err)
	}

	sendReset := func() string {
		t.Helper()
		reply := post("forgot-password", "", map[string]string{"nip": nip}, 202)
		if reply != unknown {
			t.Fatal("public response discloses verified account")
		}
		return recoveryLinkToken(t, mailbox.receive(t, "Reset password Manrisk", recipient), "/reset-password")
	}
	expired := sendReset()
	if _, err := pool.Exec(ctx, `UPDATE auth_email_tokens SET expires_at=NOW()-interval '1 second' WHERE user_id=$1`, userID); err != nil {
		t.Fatal(err)
	}
	post("reset-password", "", map[string]string{"token": expired, "newPassword": newPassword, "confirmPassword": newPassword}, 422)

	resetToken := sendReset()
	post("verify-email/confirm", "", map[string]string{"token": resetToken}, 422)
	post("reset-password", "", map[string]string{"token": resetToken, "newPassword": newPassword, "confirmPassword": "mismatch"}, 422)

	// Two concurrent confirmations of one token can only change the password once.
	start := make(chan struct{})
	results := make(chan error, 2)
	for range 2 {
		go func() {
			<-start
			results <- recovery.Reset(ctx, resetToken, newPassword, newPassword)
		}()
	}
	close(start)
	first, second := <-results, <-results
	if first == nil {
		first, second = second, first
	}
	if !errors.Is(first, identity.ErrInvalidEmailToken) || second != nil {
		t.Fatalf("concurrent reset should succeed exactly once: %v, %v", first, second)
	}
	post("reset-password", "", map[string]string{"token": resetToken, "newPassword": newPassword, "confirmPassword": newPassword}, 422)
	if _, err := auth.Validate(ctx, domain.ManrisApplication, session.Token); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("Manris session survived reset: %v", err)
	}
	if _, err := auth.Validate(ctx, "recovery_test", external.Token); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("external session survived reset: %v", err)
	}
	if _, err := auth.Login(ctx, domain.ManrisApplication, nip, oldPassword); !errors.Is(err, domainerrors.ErrInvalidCredentials) {
		t.Fatalf("previous password survived reset: %v", err)
	}
	if _, err := auth.Login(ctx, domain.ManrisApplication, nip, newPassword); err != nil {
		t.Fatalf("new password did not work: %v", err)
	}

	// The next reset request is the next message in the single worker’s mailbox.
	// A completion email queued by either reset would arrive before it.
	stale := sendReset()
	if err := directory.UpdateProfile(ctx, userID, domain.ProfileUpdate{Name: "Email Recovery", Email: "changed@example.test", NIP: nip}); err != nil {
		t.Fatal(err)
	}
	changed, err := directory.GetByID(ctx, userID)
	if err != nil || changed.EmailVerified {
		t.Fatalf("old email verification survived an address change: %v", err)
	}
	post("reset-password", "", map[string]string{"token": stale, "newPassword": newPassword, "confirmPassword": newPassword}, 422)
}
