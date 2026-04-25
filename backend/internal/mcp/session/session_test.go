package session

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestSessionManager_Empty(t *testing.T) {
	m := &Manager{}
	_, err := m.Get()
	if err != ErrNoSession {
		t.Errorf("Get on empty manager: expected ErrNoSession, got %v", err)
	}
}

func TestSessionManager_Set_Get(t *testing.T) {
	m := &Manager{}
	s := &Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test User",
		Role:             "admin",
		AccessibleOrgIDs: []uuid.UUID{uuid.New()},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	m.Set(s)

	retrieved, err := m.Get()
	if err != nil {
		t.Fatalf("Get after Set: expected no error, got %v", err)
	}

	if retrieved.Username != s.Username {
		t.Errorf("Username mismatch: expected %s, got %s", s.Username, retrieved.Username)
	}
	if retrieved.UserID != s.UserID {
		t.Errorf("UserID mismatch")
	}
}

func TestSessionManager_Expired(t *testing.T) {
	m := &Manager{}
	s := &Session{
		UserID:           uuid.New(),
		Username:         "expireduser",
		Name:             "Expired User",
		Role:             "reviewer",
		AccessibleOrgIDs: []uuid.UUID{uuid.New()},
		ExpiresAt:        time.Now().Add(-1 * time.Hour), // expired
	}

	m.Set(s)

	_, err := m.Get()
	if err != ErrSessionExpired {
		t.Errorf("Get on expired session: expected ErrSessionExpired, got %v", err)
	}
}

func TestSessionManager_Clear(t *testing.T) {
	m := &Manager{}
	s := &Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test User",
		Role:             "pimpinan",
		AccessibleOrgIDs: []uuid.UUID{uuid.New()},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	m.Set(s)

	// Verify it was set
	_, err := m.Get()
	if err != nil {
		t.Fatalf("Session should exist after Set, got %v", err)
	}

	// Clear
	m.Clear()

	// Verify it's gone
	_, err = m.Get()
	if err != ErrNoSession {
		t.Errorf("Get after Clear: expected ErrNoSession, got %v", err)
	}
}

func TestSessionManager_SetNil(t *testing.T) {
	m := &Manager{}
	s := &Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test User",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{uuid.New()},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	m.Set(s)

	// Set to nil (edge case)
	m.Set(nil)

	// Should now be empty
	_, err := m.Get()
	if err != ErrNoSession {
		t.Errorf("Get after Set(nil): expected ErrNoSession, got %v", err)
	}
}

func TestSessionManager_ExpiryEdgeCase(t *testing.T) {
	m := &Manager{}
	s := &Session{
		UserID:           uuid.New(),
		Username:         "edgeuser",
		Name:             "Edge User",
		Role:             "admin",
		AccessibleOrgIDs: []uuid.UUID{uuid.New()},
		ExpiresAt:        time.Now(), // expired at this exact moment
	}

	m.Set(s)

	// Should still be considered expired (time.Now() >= ExpiresAt)
	_, err := m.Get()
	if err != ErrSessionExpired {
		t.Errorf("Get at exact expiry time: expected ErrSessionExpired, got %v", err)
	}
}
