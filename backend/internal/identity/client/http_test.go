package client

import (
	"context"
	"errors"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/service"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestHTTPValidate(t *testing.T) {
	id := uuid.New()
	cases := []struct {
		name       string
		status     int
		body       string
		networkErr bool
		want       error
	}{
		{name: "valid shared identity", status: 200, body: `{"data":{"id":"` + id.String() + `","name":"Dika","role":"reviewer","status":"active","isGlobal":false}}`},
		{name: "invalid token", status: 401, want: domainerrors.ErrUnauthorized},
		{name: "disabled user", status: 403, want: domainerrors.ErrUnauthorized},
		{name: "upstream unavailable", status: 503, want: service.ErrUnavailable},
		{name: "timeout", networkErr: true, want: service.ErrUnavailable},
		{name: "malformed response", status: 200, body: `{`, want: service.ErrUnavailable},
		{name: "missing identity", status: 200, body: `{"data":{}}`, want: service.ErrUnavailable},
		{name: "redirect rejected", status: 302, want: service.ErrUnavailable},
		{name: "oversized response", status: 200, body: strings.Repeat("x", (1<<20)+1), want: service.ErrUnavailable},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, err := New("https://auth.example.test/api/v1", "products", "dummy-app-key")
			if err != nil {
				t.Fatal(err)
			}
			c.http.Transport = roundTripFunc(func(req *http.Request) (*http.Response, error) {
				if req.URL.Path != "/api/v1/auth/me" || req.Header.Get("X-App-Key") != "dummy-app-key" || req.Header.Get("Authorization") != "Bearer dummy-token" {
					t.Fatal("missing backend application credentials")
				}
				if tc.networkErr {
					return nil, errors.New("dummy network failure")
				}
				return &http.Response{StatusCode: tc.status, Body: io.NopCloser(strings.NewReader(tc.body)), Header: http.Header{"X-Auth-App-Id": []string{"products"}}}, nil
			})
			i, err := c.Validate(context.Background(), "products", "dummy-token")
			if !errors.Is(err, tc.want) {
				t.Fatalf("got %v want %v", err, tc.want)
			}
			if tc.want == nil && (i == nil || i.Profile.ID != id || i.ApplicationID != "products") {
				t.Fatal("wrong identity")
			}
			if _, err := c.Validate(context.Background(), "manris", "dummy-token"); !errors.Is(err, domainerrors.ErrUnauthorized) {
				t.Fatal("accepted different application")
			}
		})
	}
}
func TestHTTPConfiguration(t *testing.T) {
	for _, u := range []string{"http://auth.example.test/api/v1", "file:///tmp/auth", "https://user:pass@auth.example.test", "https://auth.example.test?key=secret"} {
		if _, err := New(u, "products", "dummy"); err == nil {
			t.Fatalf("accepted unsafe URL %q", u)
		}
	}
	if _, err := New("http://127.0.0.1:8080/api/v1", "products", "dummy"); err != nil {
		t.Fatal(err)
	}
}

func TestHTTPRejectsApplicationKeyConfigurationMismatch(t *testing.T) {
	c, err := New("https://auth.example.test/api/v1", "manris", "dummy-external-app-key")
	if err != nil {
		t.Fatal(err)
	}
	c.http.Transport = roundTripFunc(func(_ *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: http.Header{"X-Auth-App-Id": []string{"products"}}, Body: io.NopCloser(strings.NewReader(`{"data":{"id":"` + uuid.New().String() + `","role":"superadmin","status":"active"}}`))}, nil
	})
	if _, err := c.Validate(context.Background(), "manris", "dummy-token"); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("wrong application accepted: %v", err)
	}
}
