package http

import (
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	identity "github.com/manris/backend/internal/identity/service"
	"github.com/manris/backend/internal/middleware"
)

// RegisterEmailRecoveryRoutes follows the shared /auth application-key middleware.
func RegisterEmailRecoveryRoutes(api fiber.Router, auth *identity.Service, recovery *identity.EmailRecovery) {
	ipLimit := func() fiber.Handler {
		return limiter.New(limiter.Config{Max: 60, Expiration: time.Minute})
	}
	enabled := func(c *fiber.Ctx) error {
		if recovery == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Pemulihan lewat email belum tersedia. Hubungi Super Admin."})
		}
		return c.Next()
	}

	api.Post("/auth/forgot-password", requireManrisApplication, enabled, ipLimit(), func(c *fiber.Ctx) error {
		var input struct {
			NIP string `json:"nip"`
		}
		if err := c.BodyParser(&input); err != nil {
			return identityError(c, domainerrors.ErrInvalidInput)
		}
		if err := recovery.RequestReset(input.NIP); err != nil {
			return emailRecoveryError(c, err)
		}
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"accepted": true})
	})

	api.Post("/auth/reset-password", requireManrisApplication, enabled, ipLimit(), func(c *fiber.Ctx) error {
		var input struct {
			Token           string `json:"token"`
			NewPassword     string `json:"newPassword"`
			ConfirmPassword string `json:"confirmPassword"`
		}
		if err := c.BodyParser(&input); err != nil {
			return identityError(c, domainerrors.ErrInvalidInput)
		}
		if err := recovery.Reset(c.Context(), input.Token, input.NewPassword, input.ConfirmPassword); err != nil {
			if errors.Is(err, domainerrors.ErrInvalidInput) {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
					"error": "Gunakan minimal 8 karakter, maksimal 72 byte, dan pastikan kedua kolom password sama.",
				})
			}
			return emailRecoveryError(c, err)
		}
		return c.SendStatus(fiber.StatusNoContent)
	})

	verificationLimit := limiter.New(limiter.Config{
		Max: 10, Expiration: time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string { return fmt.Sprint(c.Locals("userId")) },
	})
	api.Post("/auth/verify-email/request", requireManrisApplication,
		middleware.IdentityRequired(auth, domain.ManrisApplication), middleware.RequireFullSession(), enabled, verificationLimit,
		func(c *fiber.Ctx) error {
			var input struct {
				CurrentPassword string `json:"currentPassword"`
			}
			if err := c.BodyParser(&input); err != nil {
				return identityError(c, domainerrors.ErrInvalidInput)
			}
			id, _ := c.Locals("userId").(uuid.UUID)
			if err := recovery.RequestVerification(c.Context(), id, input.CurrentPassword); err != nil {
				return emailRecoveryError(c, err)
			}
			return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"accepted": true})
		})

	api.Post("/auth/verify-email/resend-registration", requireManrisApplication, enabled, ipLimit(), func(c *fiber.Ctx) error {
		var input struct {
			NIP      string `json:"nip"`
			Password string `json:"password"`
		}
		if err := c.BodyParser(&input); err != nil {
			return identityError(c, domainerrors.ErrInvalidInput)
		}
		err := recovery.RequestRegistrationVerification(c.Context(), input.NIP, input.Password)
		switch {
		case errors.Is(err, domainerrors.ErrInvalidCredentials):
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "NIP atau password tidak sesuai."})
		case errors.Is(err, domainerrors.ErrInvalidEmail):
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Alamat email registrasi tidak valid. Hubungi Super Admin."})
		case err != nil:
			return emailRecoveryError(c, err)
		}
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"accepted": true})
	})

	api.Post("/auth/verify-email/confirm", requireManrisApplication, enabled, ipLimit(), func(c *fiber.Ctx) error {
		var input struct {
			Token string `json:"token"`
		}
		if err := c.BodyParser(&input); err != nil {
			return identityError(c, domainerrors.ErrInvalidInput)
		}
		pendingApproval, err := recovery.Verify(c.Context(), input.Token)
		if err != nil {
			return emailRecoveryError(c, err)
		}
		if pendingApproval {
			return c.JSON(fiber.Map{"data": fiber.Map{"pendingApproval": true}})
		}
		return c.SendStatus(fiber.StatusNoContent)
	})
}

func emailRecoveryError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, identity.ErrEmailRecoveryBusy):
		c.Set(fiber.HeaderRetryAfter, "60")
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Permintaan sedang padat. Coba lagi dalam satu menit."})
	case errors.Is(err, identity.ErrInvalidEmailToken):
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "Tautan sudah kedaluwarsa, telah digunakan, atau tidak valid. Minta tautan baru.",
			"type":  "INVALID_EMAIL_TOKEN",
		})
	case errors.Is(err, domainerrors.ErrInvalidCredentials):
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Password saat ini tidak sesuai."})
	case errors.Is(err, domainerrors.ErrInvalidEmail):
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Perbarui alamat email di pengaturan profil, lalu coba lagi."})
	default:
		return identityError(c, err)
	}
}
