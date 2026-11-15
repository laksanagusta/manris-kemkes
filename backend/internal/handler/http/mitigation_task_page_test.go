package http

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
)

type scopedTaskPageRepoStub struct {
	mitigationTaskRepoStub
	filter repository.ScopedTaskPageFilter
}

func (r *scopedTaskPageRepoStub) ListScopedPage(_ context.Context, filter repository.ScopedTaskPageFilter) (*repository.ScopedTaskPage, error) {
	r.filter = filter
	return &repository.ScopedTaskPage{
		Data: []*entity.MitigationTask{{ID: uuid.New()}}, Total: 25, Page: filter.Page, Limit: filter.Limit,
		Summary: repository.TaskStatusSummary{Total: 40, Done: 15},
	}, nil
}

func TestMonitoringTaskPagePreservesScopeAndMetadata(t *testing.T) {
	orgID, monitoringID, mitigationID := uuid.New(), uuid.New(), uuid.New()
	repo := &scopedTaskPageRepoStub{}
	handler := NewMitigationTaskHandler(mtuc.NewListTasksUseCase(repo, nil), nil, nil, nil, nil)
	app := fiber.New()
	app.Get("/monitoring/:id/tasks", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{OrganizationID: &orgID, AccessibleOrgIDs: []uuid.UUID{orgID}})
		return c.Next()
	}, handler.ListByMonitoring)
	response, err := app.Test(httptest.NewRequest("GET", "/monitoring/"+monitoringID.String()+"/tasks?page=3&limit=10&mitigation_id="+mitigationID.String(), nil))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != 200 {
		t.Fatalf("status %d", response.StatusCode)
	}
	if repo.filter.MonitoringID == nil || *repo.filter.MonitoringID != monitoringID || repo.filter.MitigationID == nil || *repo.filter.MitigationID != mitigationID {
		t.Fatalf("document filter lost %#v", repo.filter)
	}
	if len(repo.filter.OrgIDs) != 1 || repo.filter.OrgIDs[0] != orgID {
		t.Fatal("scope lost")
	}
	var payload repository.ScopedTaskPage
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if payload.Total != 25 || payload.Summary.Total != 40 || payload.Page != 3 || payload.Limit != 10 || len(payload.Data) != 1 {
		t.Fatalf("pagination envelope lost %#v", payload)
	}
}
