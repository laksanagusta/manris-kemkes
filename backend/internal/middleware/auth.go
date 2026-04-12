// Package middleware provides Fiber middleware for authentication.
package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

const AccessScopeKey = "accessScope"

// ScopeResolver resolves an AccessScope from raw JWT identity claims.
// OrganizationHierarchy satisfies this interface.
type ScopeResolver interface {
	ResolveAccessScope(ctx context.Context, userID uuid.UUID, rawRole string, orgID *uuid.UUID) (*entity.AccessScope, error)
}

// JWTClaims are custom claims for the JWT.
type JWTClaims struct {
	UserID         uuid.UUID `json:"userId"`
	Username       string    `json:"username"`
	Role           string    `json:"role"`
	OrganizationID string    `json:"organizationId"`
	SetupOnly      bool      `json:"setupOnly"`
	jwt.RegisteredClaims
}

// GenerateToken creates a signed JWT token string.
func GenerateToken(userID uuid.UUID, username, role, orgID string, setupOnly bool, secret string, expiryHours int) (string, error) {
	claims := JWTClaims{
		UserID:         userID,
		Username:       username,
		Role:           role,
		OrganizationID: orgID,
		SetupOnly:      setupOnly,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiryHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// AuthRequired is a Fiber middleware that validates JWT tokens.
func AuthRequired(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing authorization header"})
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authorization format"})
		}

		claims := &JWTClaims{}
		token, err := jwt.ParseWithClaims(parts[1], claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired token"})
		}

		// Store claims in context locals
		c.Locals("userId", claims.UserID)
		c.Locals("username", claims.Username)
		c.Locals("role", claims.Role)
		c.Locals("organizationId", claims.OrganizationID)
		c.Locals("setupOnly", claims.SetupOnly)

		return c.Next()
	}
}

func RequireFullSession() fiber.Handler {
	return func(c *fiber.Ctx) error {
		setupOnly, _ := c.Locals("setupOnly").(bool)
		if setupOnly {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "full session required"})
		}
		return c.Next()
	}
}

// RoleGuard restricts access to specific roles.
func RoleGuard(allowed ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals("role").(string)
		for _, r := range allowed {
			if role == r {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "insufficient permissions"})
	}
}

// ResolveOrgScope is a middleware that builds an AccessScope from JWT locals
// and stores it in Fiber locals under AccessScopeKey.
func ResolveOrgScope(resolver ScopeResolver) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, _ := c.Locals("userId").(uuid.UUID)
		rawRole, _ := c.Locals("role").(string)

		var orgID *uuid.UUID
		if raw, ok := c.Locals("organizationId").(string); ok && raw != "" {
			parsed, err := uuid.Parse(raw)
			if err == nil {
				orgID = &parsed
			}
		}

		scope, err := resolver.ResolveAccessScope(c.Context(), userID, rawRole, orgID)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "insufficient permissions"})
		}

		c.Locals(AccessScopeKey, scope)
		return c.Next()
	}
}

// GetAccessScope retrieves the resolved AccessScope from Fiber locals.
// Returns nil if no scope has been resolved (middleware not applied).
func GetAccessScope(c *fiber.Ctx) *entity.AccessScope {
	scope, _ := c.Locals(AccessScopeKey).(*entity.AccessScope)
	return scope
}
