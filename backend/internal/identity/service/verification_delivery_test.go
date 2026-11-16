package service

import (
	"fmt"
	"net/textproto"
	"testing"
	"time"
)

func TestVerificationDeliveryOutcome(t *testing.T) {
	for _, check := range []struct {
		name, status, failure string
		attempt               int
		sent                  bool
		err                   error
		delay                 time.Duration
	}{
		{name: "relay accepted", status: "accepted", attempt: 1, sent: true},
		{name: "obsolete recipient details", status: "cancelled", attempt: 1},
		{name: "first temporary failure", status: "retrying", failure: "temporary", attempt: 1, err: smtpRejection(451), delay: time.Minute},
		{name: "second temporary failure", status: "retrying", failure: "temporary", attempt: 2, err: smtpRejection(451), delay: 2 * time.Minute},
		{name: "temporary failure exhausted", status: "failed", failure: "temporary", attempt: 4, err: smtpRejection(451)},
		{name: "authentication rejected", status: "failed", failure: "configuration", attempt: 1, err: smtpRejection(535)},
		{name: "permanent rejection", status: "failed", failure: "permanent", attempt: 1, err: smtpRejection(554)},
	} {
		t.Run(check.name, func(t *testing.T) {
			status, failure, delay := verificationDeliveryOutcome(check.attempt, check.sent, check.err)
			if status != check.status || failure != check.failure || delay != check.delay {
				t.Fatalf("got %s/%s/%s, want %s/%s/%s", status, failure, delay, check.status, check.failure, check.delay)
			}
		})
	}
}

func smtpRejection(code int) error {
	return fmt.Errorf("smtp command: %w", &textproto.Error{Code: code, Msg: "test rejection"})
}
