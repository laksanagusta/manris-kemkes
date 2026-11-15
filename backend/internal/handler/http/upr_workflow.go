package http

import (
	"errors"
	"log/slog"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	"github.com/manris/backend/internal/repository/postgres"
)

type uprActor struct {
	org  uuid.UUID
	user uuid.UUID
}

func RegisterUPRWorkflowRoutes(router fiber.Router, workflow *postgres.UPRWorkflow) {
	registerMonitoringRuleRoutes(router, workflow)
	router.Get("/annual-profiles", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		data, err := workflow.AnnualProfileList(c.Context(), a.org)
		return uprData(c, data, err)
	}))
	router.Get("/annual-profiles/:year/pickup", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		year, err := uprYear(c)
		if err != nil {
			return err
		}
		var source *uuid.UUID
		if value := c.Query("sourceProfileId"); value != "" {
			id, err := uuid.Parse(value)
			if err != nil || id == uuid.Nil {
				return invalidUPRID
			}
			source = &id
		}
		data, err := workflow.AnnualPickup(c.Context(), a.org, year, source)
		return uprData(c, data, err)
	}))
	router.Post("/annual-profiles/:year/initiate", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		year, err := uprYear(c)
		if err != nil {
			return err
		}
		var input postgres.AnnualProfileInitiation
		if err := c.BodyParser(&input); err != nil {
			return invalidUPRBody
		}
		id, err := workflow.InitiateAnnualProfile(c.Context(), a.org, a.user, year, input)
		return uprData(c, fiber.Map{"id": id}, err)
	}))
	router.Get("/annual-profiles/:year", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		year, err := uprYear(c)
		if err != nil {
			return err
		}
		var id uuid.UUID
		if value := c.Query("version"); value != "" {
			id, err = uuid.Parse(value)
			if err != nil {
				return invalidUPRID
			}
		}
		data, err := workflow.AnnualProfileForScope(c.Context(), middleware.GetAccessScope(c), a.org, year, id)
		return uprData(c, data, err)
	}))
	router.Get("/annual-profiles/:year/candidates", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		year, err := uprYear(c)
		if err != nil {
			return err
		}
		data, err := workflow.AnnualCandidates(c.Context(), a.org, year)
		return uprData(c, data, err)
	}))
	router.Post("/annual-profiles/:year/draft", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		year, err := uprYear(c)
		if err != nil {
			return err
		}
		id, err := workflow.CreateAnnualDraft(c.Context(), a.org, a.user, year)
		return uprData(c, fiber.Map{"id": id}, err)
	}))
	router.Post("/annual-profile-versions/:id/members", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		var input postgres.AnnualMemberInput
		if err := c.BodyParser(&input); err != nil {
			return invalidUPRBody
		}
		risk, err := workflow.SaveAnnualMember(c.Context(), a.org, a.user, id, input)
		return uprData(c, fiber.Map{"riskId": risk}, err)
	}))
	router.Delete("/annual-profile-versions/:id/members/:group", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		group, err := uuid.Parse(c.Params("group"))
		if err != nil {
			return invalidUPRID
		}
		return uprData(c, fiber.Map{}, workflow.RemoveAnnualMember(c.Context(), a.org, id, group))
	}))
	router.Post("/annual-profile-versions/:id/finalize", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		return uprData(c, fiber.Map{}, workflow.FinalizeAnnualProfile(c.Context(), a.org, a.user, id))
	}))
	router.Delete("/annual-profile-versions/:id", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		return uprData(c, fiber.Map{}, workflow.DeleteAnnualDraft(c.Context(), a.org, id))
	}))
	router.Get("/upr-reports", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		if c.Query("view") == "collection" {
			var organizationID *uuid.UUID
			if raw := c.Query("organization_id"); raw != "" {
				id, err := uuid.Parse(raw)
				if err != nil {
					return invalidUPRID
				}
				organizationID = &id
			}
			data, err := workflow.ReportCollection(c.Context(), a.org, postgres.UPRReportCollectionFilter{
				Query: c.Query("q"), OrganizationID: organizationID,
				Period: c.Query("period"), Status: c.Query("status"),
				SortBy: c.Query("sort_by"), SortOrder: c.Query("sort_order"),
				Page: c.QueryInt("page", 1), Limit: c.QueryInt("limit", 20),
			})
			return uprData(c, data, err)
		}
		data, err := workflow.ReportWorkspace(c.Context(), a.org, c.Query("include_sources") != "false")
		return uprData(c, data, err)
	}))
	router.Post("/upr-reports/semester/preview", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		var input postgres.UPRSemesterInput
		if err := c.BodyParser(&input); err != nil {
			return invalidUPRBody
		}
		data, err := workflow.PreviewSemester(c.Context(), a.org, input)
		return uprData(c, data, err)
	}))
	router.Post("/upr-reports/semester/finalize", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		var input postgres.UPRSemesterInput
		if err := c.BodyParser(&input); err != nil {
			return invalidUPRBody
		}
		id, err := workflow.FinalizeSemester(c.Context(), a.org, a.user, input)
		return uprData(c, fiber.Map{"id": id}, err)
	}))
	router.Post("/upr-report-drafts", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		var input postgres.UPRReportDraftInput
		if err := c.BodyParser(&input); err != nil {
			return invalidUPRBody
		}
		draft, err := workflow.SaveReportDraft(c.Context(), a.org, a.user, uuid.Nil, 0, input)
		return uprData(c, draft, err)
	}))
	router.Post("/upr-report-drafts/preview", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		var input postgres.UPRReportDraftInput
		if err := c.BodyParser(&input); err != nil {
			return invalidUPRBody
		}
		snapshot, err := workflow.PreviewReportDraft(c.Context(), a.org, input)
		return uprData(c, snapshot, err)
	}))
	router.Get("/upr-report-drafts/documents", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		year, yearErr := strconv.Atoi(c.Query("year"))
		semester, semesterErr := strconv.Atoi(c.Query("semester"))
		page, pageErr := strconv.Atoi(c.Query("page", "1"))
		if yearErr != nil || semesterErr != nil || pageErr != nil {
			return postgres.UPRWorkflowError("Pencarian dokumen tidak valid.")
		}
		scope := postgres.UPRSemesterInput{Year: year, Semester: semester}
		result, err := workflow.SearchReportDocuments(c.Context(), a.org, c.Query("kind"), scope, c.Query("q"), page)
		return uprData(c, result, err)
	}))
	router.Post("/upr-report-drafts/documents/selected", uprRoute(func(c *fiber.Ctx, a uprActor) error {
		var body struct {
			OrganizationID *uuid.UUID  `json:"organizationId"`
			Year           int         `json:"year"`
			Semester       int         `json:"semester"`
			IDs            []uuid.UUID `json:"ids"`
		}
		if err := c.BodyParser(&body); err != nil {
			return invalidUPRBody
		}
		org := a.org
		if body.OrganizationID != nil {
			scope := middleware.GetAccessScope(c)
			if *body.OrganizationID == uuid.Nil || !scope.CanRead(*body.OrganizationID) {
				return c.SendStatus(fiber.StatusForbidden)
			}
			org = *body.OrganizationID
		}
		scope := postgres.UPRSemesterInput{Year: body.Year, Semester: body.Semester}
		items, err := workflow.SelectedReportDocuments(c.Context(), org, scope, body.IDs)
		return uprData(c, items, err)
	}))
	router.Get("/upr-report-drafts/:id", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		draft, err := workflow.GetReportDraftForScope(c.Context(), middleware.GetAccessScope(c), id)
		return uprData(c, draft, err)
	}))
	router.Put("/upr-report-drafts/:id", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		var body struct {
			Input    postgres.UPRReportDraftInput `json:"input"`
			Revision int                          `json:"revision"`
		}
		if err := c.BodyParser(&body); err != nil {
			return invalidUPRBody
		}
		draft, err := workflow.SaveReportDraft(c.Context(), a.org, a.user, id, body.Revision, body.Input)
		return uprData(c, draft, err)
	}))
	router.Post("/upr-report-drafts/:id/send", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		var body struct {
			Revision  int    `json:"revision"`
			ReviewKey string `json:"reviewKey"`
		}
		if err := c.BodyParser(&body); err != nil {
			return invalidUPRBody
		}
		sentID, err := workflow.SendReportDraft(c.Context(), a.org, a.user, id, body.Revision, body.ReviewKey)
		return uprData(c, fiber.Map{"id": sentID}, err)
	}))
	router.Get("/upr-reports/:id", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		data, err := workflow.ReportDetailForScope(c.Context(), middleware.GetAccessScope(c), a.org, id)
		return uprData(c, data, err)
	}))
	router.Post("/upr-reports/:id/send", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		var input struct {
			Kind               string     `json:"kind"`
			PreviousDeliveryID *uuid.UUID `json:"previousDeliveryId"`
		}
		if err := c.BodyParser(&input); err != nil {
			return invalidUPRBody
		}
		reportID, err := workflow.SendUPRReport(c.Context(), a.org, a.user, id, input.Kind, input.PreviousDeliveryID)
		return uprData(c, fiber.Map{"id": reportID}, err)
	}))
	router.Post("/upr-report-deliveries/:id/resolve", uprVersionRoute(func(c *fiber.Ctx, a uprActor, id uuid.UUID) error {
		var input struct {
			Resolution string `json:"resolution"`
			Note       string `json:"note"`
		}
		if err := c.BodyParser(&input); err != nil {
			return invalidUPRBody
		}
		return uprData(c, fiber.Map{}, workflow.ResolveUPRReport(c.Context(), a.org, a.user, id, input.Resolution, input.Note))
	}))
}

const (
	invalidUPRBody postgres.UPRWorkflowError = "Data permintaan tidak valid."
	invalidUPRID   postgres.UPRWorkflowError = "ID tidak valid."
)

func uprYear(c *fiber.Ctx) (int, error) {
	year, err := strconv.Atoi(c.Params("year"))
	if err != nil || year < 1900 || year > 9998 {
		return 0, postgres.UPRWorkflowError("Tahun profil tidak valid.")
	}
	return year, nil
}

func uprRoute(action func(*fiber.Ctx, uprActor) error) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set(fiber.HeaderCacheControl, "no-store")
		scope := middleware.GetAccessScope(c)
		if scope == nil || scope.OrganizationID == nil || *scope.OrganizationID == uuid.Nil || scope.UserID == uuid.Nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Akun harus terhubung ke organisasi."})
		}
		org := *scope.OrganizationID
		if c.Method() == fiber.MethodGet && c.Query("org_id") != "" {
			requested, err := uuid.Parse(c.Query("org_id"))
			if err != nil || requested == uuid.Nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": invalidUPRID.Error()})
			}
			if !scope.CanRead(requested) {
				return c.SendStatus(fiber.StatusForbidden)
			}
			org = requested
		}
		err := action(c, uprActor{org: org, user: scope.UserID})
		if err == nil {
			return nil
		}
		var validation postgres.UPRWorkflowError
		if errors.As(err, &validation) {
			status := fiber.StatusUnprocessableEntity
			switch validation {
			case postgres.ErrUPRNotFound:
				status = fiber.StatusNotFound
			case postgres.ErrUPRConflict, postgres.ErrAnnualProfileExists:
				status = fiber.StatusConflict
			}
			return c.Status(status).JSON(fiber.Map{"error": validation.Error()})
		}
		if handled, result := monitoringRuleDatabaseProblem(c, err); handled {
			return result
		}
		slog.Error("UPR workflow request failed", "path", c.Route().Path, "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Manrisk belum bisa memproses permintaan. Coba lagi."})
	}
}

func uprVersionRoute(action func(*fiber.Ctx, uprActor, uuid.UUID) error) fiber.Handler {
	return uprRoute(func(c *fiber.Ctx, a uprActor) error {
		id, err := uuid.Parse(c.Params("id"))
		if err != nil || id == uuid.Nil {
			return invalidUPRID
		}
		return action(c, a, id)
	})
}

func uprData(c *fiber.Ctx, data any, err error) error {
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"data": data})
}
