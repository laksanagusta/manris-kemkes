package service_test

import (
	"github.com/manris/backend/internal/identity/service"
	"testing"
	"time"
)

func TestNewRejectsUnsafeSigningConfiguration(t *testing.T) {
	cases := []struct {
		name, secret string
		lifetime     time.Duration
	}{
		{"weak secret", "change-me", time.Minute},
		{"zero token lifetime", "dummy-signing-secret-at-least-32-bytes", 0},
		{"negative token lifetime", "dummy-signing-secret-at-least-32-bytes", -time.Minute},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := service.New(nil, nil, nil, tc.secret, tc.lifetime); err == nil {
				t.Fatal("unsafe configuration accepted")
			}
		})
	}
}
