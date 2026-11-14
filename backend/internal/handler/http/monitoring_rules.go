package http

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/middleware"
	"github.com/manris/backend/internal/repository/postgres"
)

func registerMonitoringRuleRoutes(router fiber.Router, workflow *postgres.UPRWorkflow) {
	router.Get("/monitoring-rules", func(c *fiber.Ctx) error {
		scope := middleware.GetAccessScope(c)
		if scope == nil || scope.UserID == uuid.Nil {
			return c.SendStatus(fiber.StatusUnauthorized)
		}
		data, err := workflow.MonitoringRules(c.Context(), entity.NormalizeRole(scope.Role) == entity.RoleSuperAdmin && c.Query("includeInactive") == "true")
		if err != nil {
			return handleError(c, err)
		}
		return c.JSON(fiber.Map{"data": data})
	})
	router.Post("/monitoring-rules", func(c *fiber.Ctx) error {
		scope := middleware.GetAccessScope(c)
		if scope == nil || entity.NormalizeRole(scope.Role) != entity.RoleSuperAdmin || scope.UserID == uuid.Nil {
			return c.SendStatus(fiber.StatusForbidden)
		}
		var input entity.MonitoringRule
		if err := c.BodyParser(&input); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data aturan tidak valid."})
		}
		rule, err := workflow.CreateMonitoringRule(c.Context(), scope.UserID, input)
		if err != nil {
			var validation postgres.UPRWorkflowError
			if errors.As(err, &validation) {
				return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": validation.Error()})
			}
			return handleError(c, err)
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": rule})
	})
	router.Get("/annual-profile-versions/:id/period-progress", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		data, err := workflow.AnnualProfilePeriodProgress(c.Context(), a.org, id)
		return uprData(c, data, err)
	}))
}

func monitoringRuleDatabaseProblem(c *fiber.Ctx, err error) (bool, error) {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false, nil
	}
	if pgErr.Code == "23505" && (pgErr.ConstraintName == "risk_monitorings_profile_period_family" || pgErr.ConstraintName == "working_papers_profile_period" || pgErr.ConstraintName == "evaluations_profile_period") {
		return true, sendProblemDetails(c, fiber.StatusConflict, "Dokumen periode sudah ada", "https://api.manris.com/errors/period-conflict", "Dokumen untuk profil dan periode ini sudah ada. Buka dokumen yang ada.")
	}
	if pgErr.Code == "23514" && pgErr.Where != "" {
		return true, sendProblemDetails(c, fiber.StatusUnprocessableEntity, "Periode pemantauan tidak valid", "https://api.manris.com/errors/monitoring-period", pgErr.Message)
	}
	return false, nil
}
