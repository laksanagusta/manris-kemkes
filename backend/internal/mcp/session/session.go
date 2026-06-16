package session

import (
	"errors"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNoSession      = errors.New("tidak ada sesi")
	ErrSessionExpired = errors.New("sesi kedaluwarsa")
)

type Session struct {
	UserID           uuid.UUID
	Username         string
	Name             string
	Role             string
	AccessibleOrgIDs []uuid.UUID
	ExpiresAt        time.Time
}

type Manager struct {
	current atomic.Pointer[Session]
}

func (m *Manager) Set(s *Session) {
	m.current.Store(s)
}

func (m *Manager) Get() (*Session, error) {
	s := m.current.Load()
	if s == nil {
		return nil, ErrNoSession
	}

	if time.Now().After(s.ExpiresAt) {
		return nil, ErrSessionExpired
	}

	return s, nil
}

func (m *Manager) Clear() {
	m.current.Store(nil)
}
