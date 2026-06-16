package http

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	picuc "github.com/manris/backend/internal/usecase/external_pic"
)

type ExternalPICHandler struct {
	getOrCreateUC *picuc.GetOrCreateByNameUseCase
	listUC        *picuc.ListExternalPICsUseCase
	deleteUC      *picuc.DeleteExternalPICUseCase
}

func NewExternalPICHandler(
	getOrCreateUC *picuc.GetOrCreateByNameUseCase,
	listUC *picuc.ListExternalPICsUseCase,
	deleteUC *picuc.DeleteExternalPICUseCase,
) *ExternalPICHandler {
	return &ExternalPICHandler{
		getOrCreateUC: getOrCreateUC,
		listUC:        listUC,
		deleteUC:      deleteUC,
	}
}

type CreateExternalPICInput struct {
	Name string `json:"name"`
}

func (h *ExternalPICHandler) Create(c *fiber.Ctx) error {
	var input CreateExternalPICInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "nama wajib diisi")
	}

	pic, err := h.getOrCreateUC.Execute(c.Context(), input.Name)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": pic})
}

func (h *ExternalPICHandler) List(c *fiber.Ctx) error {
	pics, err := h.listUC.Execute(c.Context())
	if err != nil {
		return handleError(c, err)
	}

	if pics == nil {
		pics = []*entity.ExternalPIC{}
	}

	return c.JSON(fiber.Map{"data": pics})
}

func (h *ExternalPICHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID PIC tidak valid")
	}

	if err := h.deleteUC.Execute(c.Context(), id); err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"message": "PIC eksternal berhasil dihapus"})
}
