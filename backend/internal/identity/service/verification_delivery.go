package service

import (
	"context"
	"crypto/tls"
	"errors"
	"log/slog"
	"net/textproto"
	"time"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	"github.com/manris/backend/internal/identity/smtp"
)

const maxVerificationAttempts = 4

type VerificationDelivery struct {
	ID           uuid.UUID
	Token        EmailToken
	Registration bool
	Attempt      int
}

type VerificationDeliveryStatus struct {
	Status  string `json:"status"`
	Failure string `json:"failure,omitempty"`
}

type VerificationDeliveryStore interface {
	EnqueueVerification(context.Context, EmailToken, bool) (uuid.UUID, error)
	ClaimVerification(context.Context) (*VerificationDelivery, error)
	FinishVerification(ctx context.Context, id uuid.UUID, attempt int, status, failure string, retryAfter time.Duration) error
	VerificationByID(context.Context, uuid.UUID) (*VerificationDeliveryStatus, error)
	LatestRegistrationVerification(context.Context, uuid.UUID) (uuid.UUID, *VerificationDeliveryStatus, error)
	PruneVerificationDeliveries(context.Context) error
}

func (r *EmailRecovery) VerificationDeliveryStatus(ctx context.Context, id uuid.UUID) (*VerificationDeliveryStatus, error) {
	return r.store.VerificationByID(ctx, id)
}

func (r *EmailRecovery) RegistrationDeliveryForAdmin(ctx context.Context, userID uuid.UUID, retry bool) (*VerificationDeliveryStatus, error) {
	user, err := r.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, domainerrors.ErrNotFound
	}
	if !user.IsAwaitingEmailVerification() {
		return &VerificationDeliveryStatus{Status: "unknown"}, nil
	}
	if retry {
		if !domain.ValidEmailAddress(user.Email) {
			return nil, domainerrors.ErrInvalidEmail
		}
		id, err := r.QueueRegistrationVerification(ctx, user)
		if err != nil {
			return nil, err
		}
		if id == uuid.Nil {
			return &VerificationDeliveryStatus{Status: "unknown"}, nil
		}
	}
	_, status, err := r.store.LatestRegistrationVerification(ctx, userID)
	if err != nil {
		return nil, err
	}
	if status == nil {
		return &VerificationDeliveryStatus{Status: "unknown"}, nil
	}
	return status, nil
}

func (r *EmailRecovery) processVerification(ctx context.Context) {
	claimContext, cancelClaim := context.WithTimeout(ctx, 5*time.Second)
	job, err := r.store.ClaimVerification(claimContext)
	cancelClaim()
	if err != nil {
		if ctx.Err() == nil {
			slog.Warn("could not claim email verification delivery")
		}
		return
	}
	if job == nil {
		return
	}

	status, failure := "failed", "temporary"
	var delay time.Duration
	if job.Attempt <= maxVerificationAttempts {
		deliveryContext, cancelDelivery := context.WithTimeout(ctx, 15*time.Second)
		sent, err := r.deliver(deliveryContext, job.Token, job.Registration)
		cancelDelivery()
		status, failure, delay = verificationDeliveryOutcome(job.Attempt, sent, err)
	}
	if ctx.Err() != nil {
		return // Another worker can reclaim the job after the lease expires.
	}

	updateContext, cancelUpdate := context.WithTimeout(ctx, 5*time.Second)
	defer cancelUpdate()
	if err := r.store.FinishVerification(updateContext, job.ID, job.Attempt, status, failure, delay); err != nil {
		slog.Warn("could not record email verification delivery result")
		return
	}
	if status == "failed" {
		slog.Warn("email verification delivery failed", "failure", failure, "attempt", job.Attempt)
	}
}

func verificationDeliveryOutcome(attempt int, sent bool, err error) (status, failure string, delay time.Duration) {
	if err == nil {
		if sent {
			return "accepted", "", 0
		}
		return "cancelled", "", 0
	}

	failure = verificationFailure(err)
	if failure == "temporary" && attempt < maxVerificationAttempts {
		return "retrying", failure, time.Minute << (attempt - 1)
	}
	return "failed", failure, 0
}

func verificationFailure(err error) string {
	var reply *textproto.Error
	if errors.As(err, &reply) {
		if reply.Code >= 400 && reply.Code < 500 {
			return "temporary"
		}
		switch reply.Code {
		case 530, 534, 535, 538:
			return "configuration"
		}
		if reply.Code >= 500 && reply.Code < 600 {
			if errors.Is(err, smtp.ErrRecipientRejected) {
				return "recipient"
			}
			if errors.Is(err, smtp.ErrAuthentication) {
				return "configuration"
			}
			return "permanent"
		}
	}
	var certificate *tls.CertificateVerificationError
	if errors.As(err, &certificate) {
		return "configuration"
	}
	return "temporary"
}
