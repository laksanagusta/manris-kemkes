// Package client provides the backend integration with a separately deployed identity service.
package client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	"github.com/manris/backend/internal/identity/service"
)

type HTTP struct {
	baseURL, appID, appKey string
	http                   *http.Client
}

var _ service.Validator = (*HTTP)(nil)

// New requires HTTPS except for loopback development endpoints. baseURL includes /api/v1.
func New(baseURL, appID, appKey string) (*HTTP, error) {
	u, err := url.Parse(baseURL)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return nil, fmt.Errorf("invalid identity service URL")
	}
	ip := net.ParseIP(u.Hostname())
	loopback := u.Hostname() == "localhost" || (ip != nil && ip.IsLoopback())
	if u.Scheme != "https" && !(u.Scheme == "http" && loopback) {
		return nil, fmt.Errorf("identity service requires HTTPS")
	}
	if appID == "" || appKey == "" {
		return nil, fmt.Errorf("application ID and APP_KEY required")
	}
	return &HTTP{baseURL: strings.TrimRight(baseURL, "/"), appID: appID, appKey: appKey, http: &http.Client{Timeout: 3 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}}, nil
}
func (c *HTTP) Validate(ctx context.Context, appID, token string) (*domain.Identity, error) {
	if appID != c.appID || token == "" {
		return nil, domainerrors.ErrUnauthorized
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/auth/me", nil)
	if err != nil {
		return nil, service.ErrUnavailable
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-App-Key", c.appKey)
	res, err := c.http.Do(req)
	if err != nil {
		return nil, service.ErrUnavailable
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden {
		return nil, domainerrors.ErrUnauthorized
	}
	if res.StatusCode != http.StatusOK {
		return nil, service.ErrUnavailable
	}
	if res.Header.Get("X-Auth-App-Id") != c.appID {
		return nil, domainerrors.ErrUnauthorized
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, 1<<20+1))
	if err != nil || len(data) > 1<<20 {
		return nil, service.ErrUnavailable
	}
	var body struct {
		Data *domain.Profile `json:"data"`
	}
	if json.Unmarshal(data, &body) != nil || body.Data == nil || body.Data.ID == uuid.Nil || body.Data.Status != domain.UserStatusActive {
		return nil, service.ErrUnavailable
	}
	switch body.Data.Role {
	case domain.RoleSuperAdmin, domain.RoleUnit, domain.RoleReviewer, domain.RolePimpinan:
	default:
		return nil, service.ErrUnavailable
	}
	return &domain.Identity{Profile: body.Data, ApplicationID: c.appID}, nil
}
