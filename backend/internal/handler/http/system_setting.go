package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/entity"
	systemsettinguc "github.com/manris/backend/internal/usecase/system_setting"
)

type SystemSettingHandler struct {
	getUC    *systemsettinguc.GetSettingService
	upsertUC *systemsettinguc.UpsertSettingService
	deleteUC *systemsettinguc.DeleteSettingService
}

func NewSystemSettingHandler(
	getUC *systemsettinguc.GetSettingService,
	upsertUC *systemsettinguc.UpsertSettingService,
	deleteUC *systemsettinguc.DeleteSettingService,
) *SystemSettingHandler {
	return &SystemSettingHandler{
		getUC:    getUC,
		upsertUC: upsertUC,
		deleteUC: deleteUC,
	}
}

type upsertSettingRequest struct {
	Key         string `json:"key"`
	Value       string `json:"value"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

func (h *SystemSettingHandler) Get(c *fiber.Ctx) error {
	key := c.Params("key")
	if key == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "kunci wajib diisi")
	}

	setting, err := h.getUC.Get(c.Context(), key)
	if err != nil {
		return sendProblemDetails(c, 404, "Tidak Ditemukan", "https://api.manris.com/errors/not-found", "pengaturan tidak ditemukan")
	}

	return c.JSON(fiber.Map{"data": setting})
}

func (h *SystemSettingHandler) List(c *fiber.Ctx) error {
	category := c.Query("category")

	var settings []*entity.SystemSetting
	var err error

	if category != "" {
		settings, err = h.getUC.GetByCategory(c.Context(), category)
	} else {
		settings, err = h.getUC.GetAll(c.Context())
	}

	if err != nil {
		return sendProblemDetails(c, 500, "Kesalahan Server", "https://api.manris.com/errors/server-error", err.Error())
	}

	return c.JSON(fiber.Map{"data": settings})
}

func (h *SystemSettingHandler) GetAIModels(c *fiber.Ctx) error {
	models, err := h.getUC.GetAIModels(c.Context())
	if err != nil {
		return sendProblemDetails(c, 500, "Kesalahan Server", "https://api.manris.com/errors/server-error", err.Error())
	}

	return c.JSON(fiber.Map{"data": models})
}

func (h *SystemSettingHandler) Upsert(c *fiber.Ctx) error {
	var req upsertSettingRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	if req.Key == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "kunci wajib diisi")
	}

	if req.Category == "" {
		req.Category = "general"
	}

	setting := &entity.SystemSetting{
		Key:         req.Key,
		Value:       req.Value,
		Description: req.Description,
		Category:    req.Category,
	}

	if err := h.upsertUC.Upsert(c.Context(), setting); err != nil {
		return sendProblemDetails(c, 500, "Kesalahan Server", "https://api.manris.com/errors/server-error", err.Error())
	}

	return c.JSON(fiber.Map{"data": setting})
}

func (h *SystemSettingHandler) UpdateAIModels(c *fiber.Ctx) error {
	var req entity.AIModels
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	settings := []struct {
		key   string
		value string
	}{
		{"ai.model.default", req.Default},
		{"ai.model.cause", req.Cause},
		{"ai.model.impact", req.Impact},
		{"ai.model.mitigation", req.Mitigation},
		{"ai.model.transcript", req.Transcript},
		{"ai.model.predictive", req.Predictive},
		{"ai.model.minutes", req.Minutes},
		{"ai.model.kri", req.KRI},
		{"ai.model.risk-suggestion", req.RiskSuggestion},
		{"ai.model.incident", req.Incident},
		{"ai.model.cba", req.CBA},
	}

	for _, s := range settings {
		setting := &entity.SystemSetting{
			Key:         s.key,
			Value:       s.value,
			Description: getDescriptionForKey(s.key),
			Category:    "ai",
		}
		if err := h.upsertUC.Upsert(c.Context(), setting); err != nil {
			return sendProblemDetails(c, 500, "Kesalahan Server", "https://api.manris.com/errors/server-error", err.Error())
		}
	}

	models, err := h.getUC.GetAIModels(c.Context())
	if err != nil {
		return sendProblemDetails(c, 500, "Kesalahan Server", "https://api.manris.com/errors/server-error", err.Error())
	}

	return c.JSON(fiber.Map{"data": models})
}

func (h *SystemSettingHandler) Delete(c *fiber.Ctx) error {
	key := c.Params("key")
	if key == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "kunci wajib diisi")
	}

	if err := h.deleteUC.Delete(c.Context(), key); err != nil {
		return sendProblemDetails(c, 500, "Kesalahan Server", "https://api.manris.com/errors/server-error", err.Error())
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"deleted": key}})
}

func getDescriptionForKey(key string) string {
	descriptions := map[string]string{
		"ai.model.default":         "Default AI model for all AI features",
		"ai.model.cause":           "AI model for root cause analysis (fishbone)",
		"ai.model.impact":          "AI model for impact analysis",
		"ai.model.mitigation":      "AI model for mitigation recommendations",
		"ai.model.transcript":      "AI model for meeting transcript analysis",
		"ai.model.predictive":      "AI model for predictive risk scoring",
		"ai.model.minutes":         "AI model for meeting minutes generation",
		"ai.model.kri":             "AI model for KRI suggestions",
		"ai.model.risk-suggestion": "AI model for risk suggestions",
		"ai.model.incident":        "AI model for incident extraction",
		"ai.model.cba":             "AI model for Cost-Benefit Analysis",
	}
	if desc, ok := descriptions[key]; ok {
		return desc
	}
	return ""
}
