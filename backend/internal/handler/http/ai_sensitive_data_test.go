package http

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"log/slog"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/middleware"
	aiuc "github.com/manris/backend/internal/usecase/ai"
	"github.com/xuri/excelize/v2"
)

func TestSensitiveUploadsReturnSafeValidationErrorsWithoutCallingAI(t *testing.T) {
	const privateValue = "private-upload-7788@example.test"
	for _, mode := range []string{"sop_risk_universe", "risk_event_extraction", "mitigation_report_mapper"} {
		t.Run(mode, func(t *testing.T) {
			var logs bytes.Buffer
			previousLogger, previousWriter, previousFlags := slog.Default(), log.Writer(), log.Flags()
			slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
			t.Cleanup(func() {
				slog.SetDefault(previousLogger)
				log.SetOutput(previousWriter)
				log.SetFlags(previousFlags)
			})
			workbook := excelize.NewFile()
			t.Cleanup(func() { _ = workbook.Close() })
			if err := workbook.SetCellValue("Sheet1", "A1", "Hubungi "+privateValue); err != nil {
				t.Fatal(err)
			}
			content, err := workbook.WriteToBuffer()
			if err != nil {
				t.Fatal(err)
			}
			capture := &documentUploadCaptureRepo{}
			handler := &AIHandler{documentIntelligenceUC: aiuc.NewAnalyzeDocumentIntelligenceUseCase(capture, nil)}
			app := fiber.New()
			app.Use(middleware.CorrelationID())
			app.Use(func(c *fiber.Ctx) error {
				orgID := uuid.New()
				c.Locals(middleware.AccessScopeKey, &entity.AccessScope{IsGlobal: true, OrganizationID: &orgID})
				return c.Next()
			})
			app.Post("/analyze", handler.AnalyzeDocumentIntelligence)
			req, err := newDocumentIntelligenceMultipartRequest("/analyze", "laporan.xlsx", mode, content.Bytes())
			if err != nil {
				t.Fatal(err)
			}
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			body, err := io.ReadAll(res.Body)
			if err != nil {
				t.Fatal(err)
			}
			if res.StatusCode != 422 || capture.calls != 0 {
				t.Fatal("sensitive upload must fail before AI access")
			}
			if bytes.Contains(body, []byte(privateValue)) || strings.Contains(logs.String(), privateValue) {
				t.Fatal("sensitive value leaked into response or logs")
			}
			var problem struct {
				Detail string `json:"detail"`
			}
			if err := json.Unmarshal(body, &problem); err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(problem.Detail, "data sensitif") || !strings.Contains(problem.Detail, "email") || !strings.Contains(problem.Detail, "unggah kembali") {
				t.Fatal("user did not receive actionable detection error")
			}
		})
	}
}
