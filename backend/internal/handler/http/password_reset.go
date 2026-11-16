package http

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
)

func (h *IdentityAuthHandler) ResetPassword(c *fiber.Ctx) error {
	actor, ok := c.Locals("identity").(*domain.Identity)
	if !ok || actor == nil || actor.Profile == nil {
		return identityError(c, domainerrors.ErrUnauthorized)
	}
	target, err := uuid.Parse(c.Params("id"))
	if err != nil || target == uuid.Nil {
		return identityError(c, domainerrors.ErrInvalidInput)
	}
	if actor.Profile.ID == target {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Ubah password akun Anda dari pengaturan akun."})
	}

	var input struct {
		CurrentPassword string `json:"currentPassword"`
	}
	if err := c.BodyParser(&input); err != nil || input.CurrentPassword == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Masukkan password Super Admin Anda."})
	}

	result, err := h.service.ResetPassword(c.Context(), actor.Profile.ID, target, input.CurrentPassword)
	switch {
	case errors.Is(err, domainerrors.ErrInvalidCredentials):
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Password Super Admin tidak sesuai."})
	case errors.Is(err, domainerrors.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Akun aktif tidak ditemukan."})
	case errors.Is(err, domainerrors.ErrConflict):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Akun berubah selama reset. Tinjau akun dan coba lagi."})
	case err != nil:
		return identityError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}
