package http

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/middleware"
	organizationgroupuc "github.com/manris/backend/internal/usecase/organizationgroup"
)

type organizationGroupHandlerOrgRepo struct {
	descendants []uuid.UUID
}

func (r organizationGroupHandlerOrgRepo) Create(context.Context, *entity.Organization) error {
	return nil
}
func (r organizationGroupHandlerOrgRepo) GetByID(context.Context, uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: uuid.New(), Name: "Org"}, nil
}
func (r organizationGroupHandlerOrgRepo) Update(context.Context, *entity.Organization) error {
	return nil
}
func (r organizationGroupHandlerOrgRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r organizationGroupHandlerOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r organizationGroupHandlerOrgRepo) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r organizationGroupHandlerOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) {
	return "", nil
}
func (r organizationGroupHandlerOrgRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return append([]uuid.UUID{}, r.descendants...), nil
}

type organizationGroupHandlerRepo struct {
	group              *entity.OrganizationGroup
	memberIDs          []uuid.UUID
	lastListFilter     repository.OrganizationGroupListFilter
	lastCreateMembers  []uuid.UUID
	lastUpdateMembers  []uuid.UUID
	lastDeleteID       uuid.UUID
	lastResolveGroupID uuid.UUID
}

func (r *organizationGroupHandlerRepo) Create(_ context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	if group.ID == uuid.Nil {
		group.ID = uuid.New()
	}
	r.group = group
	r.lastCreateMembers = append([]uuid.UUID(nil), memberIDs...)
	return nil
}

func (r *organizationGroupHandlerRepo) Update(_ context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	r.group = group
	r.lastUpdateMembers = append([]uuid.UUID(nil), memberIDs...)
	return nil
}

func (r *organizationGroupHandlerRepo) Delete(_ context.Context, id uuid.UUID) error {
	r.lastDeleteID = id
	return nil
}

func (r *organizationGroupHandlerRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.OrganizationGroup, error) {
	if r.group == nil || r.group.ID != id {
		return nil, domainerrors.ErrNotFound
	}
	return r.group, nil
}

func (r *organizationGroupHandlerRepo) List(_ context.Context, filter repository.OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error) {
	r.lastListFilter = filter
	if r.group == nil {
		return []*entity.OrganizationGroup{}, 0, nil
	}
	return []*entity.OrganizationGroup{r.group}, 1, nil
}

func (r *organizationGroupHandlerRepo) ListMemberIDs(_ context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	r.lastResolveGroupID = id
	return append([]uuid.UUID(nil), r.memberIDs...), nil
}

func newOrganizationGroupHandlerForTest() (*OrganizationGroupHandler, *organizationGroupHandlerRepo, *organizationGroupHandlerOrgRepo) {
	orgRepo := &organizationGroupHandlerOrgRepo{descendants: []uuid.UUID{}}
	groupRepo := &organizationGroupHandlerRepo{
		group: &entity.OrganizationGroup{
			ID:                  uuid.New(),
			OwnerOrganizationID: uuid.New(),
			Name:                "Jawa Timur",
			Description:         "Unit wilayah Jawa Timur",
		},
		memberIDs: []uuid.UUID{},
	}

	handler := NewOrganizationGroupHandler(
		organizationgroupuc.NewCreateUseCase(groupRepo, orgRepo),
		organizationgroupuc.NewUpdateUseCase(groupRepo, orgRepo),
		organizationgroupuc.NewListUseCase(groupRepo),
		organizationgroupuc.NewGetUseCase(groupRepo),
		organizationgroupuc.NewDeleteUseCase(groupRepo),
		organizationgroupuc.NewResolveUseCase(groupRepo),
	)

	return handler, groupRepo, orgRepo
}

func TestOrganizationGroupHandlerCreateReturnsCreated(t *testing.T) {
	handler, groupRepo, orgRepo := newOrganizationGroupHandlerForTest()
	owner := uuid.New()
	member := uuid.New()
	orgRepo.descendants = []uuid.UUID{owner, member}

	body, err := json.Marshal(map[string]any{
		"ownerOrganizationId":   owner.String(),
		"name":                  "Jawa Timur",
		"description":           "Wilayah timur",
		"memberOrganizationIds": []string{member.String()},
	})
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}

	app := fiber.New()
	app.Post("/organization-groups", func(c *fiber.Ctx) error {
		c.Locals(middleware.AccessScopeKey, &entity.AccessScope{
			UserID:           uuid.New(),
			Role:             entity.RoleUnit,
			OrganizationID:   &owner,
			AccessibleOrgIDs: []uuid.UUID{owner, member},
		})
		return c.Next()
	}, handler.Create)

	req := httptest.NewRequest(fiber.MethodPost, "/organization-groups", bytes.NewReader(body))
	req.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusCreated {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 201, got %d: %s", resp.StatusCode, payload)
	}
	if groupRepo.group == nil || groupRepo.group.OwnerOrganizationID != owner {
		t.Fatalf("expected group owner %s, got %#v", owner, groupRepo.group)
	}
	if len(groupRepo.lastCreateMembers) != 1 || groupRepo.lastCreateMembers[0] != member {
		t.Fatalf("expected member %s, got %v", member, groupRepo.lastCreateMembers)
	}
}

func TestOrganizationGroupHandlerListParsesFilter(t *testing.T) {
	handler, groupRepo, _ := newOrganizationGroupHandlerForTest()
	owner := uuid.New()
	scopeOwner := uuid.New()
	groupRepo.group.OwnerOrganizationID = owner

	app := fiber.New()
	app.Get("/organization-groups", func(c *fiber.Ctx) error {
		c.Locals(middleware.AccessScopeKey, &entity.AccessScope{
			UserID:           uuid.New(),
			Role:             entity.RoleUnit,
			OrganizationID:   &scopeOwner,
			AccessibleOrgIDs: []uuid.UUID{scopeOwner},
		})
		return c.Next()
	}, handler.List)

	req := httptest.NewRequest(fiber.MethodGet, "/organization-groups?owner_organization_id="+scopeOwner.String()+"&q=jawa&include_members=true&page=2&limit=25", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, payload)
	}
	if groupRepo.lastListFilter.OwnerOrganizationID == nil || *groupRepo.lastListFilter.OwnerOrganizationID != scopeOwner {
		t.Fatalf("unexpected owner filter: %#v", groupRepo.lastListFilter.OwnerOrganizationID)
	}
	if groupRepo.lastListFilter.Q != "jawa" || !groupRepo.lastListFilter.IncludeMembers || groupRepo.lastListFilter.Page != 2 || groupRepo.lastListFilter.Limit != 25 {
		t.Fatalf("unexpected filter: %#v", groupRepo.lastListFilter)
	}
}

func TestOrganizationGroupHandlerRejectsInvalidID(t *testing.T) {
	handler, _, _ := newOrganizationGroupHandlerForTest()

	app := fiber.New()
	app.Get("/organization-groups/:id", handler.Get)

	req := httptest.NewRequest(fiber.MethodGet, "/organization-groups/not-a-uuid", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 400, got %d: %s", resp.StatusCode, payload)
	}
}

func TestOrganizationGroupHandlerDeleteReturnsMessage(t *testing.T) {
	handler, groupRepo, _ := newOrganizationGroupHandlerForTest()
	groupID := uuid.New()
	owner := uuid.New()
	groupRepo.group = &entity.OrganizationGroup{ID: groupID, OwnerOrganizationID: owner, Name: "Jawa Timur"}

	app := fiber.New()
	app.Delete("/organization-groups/:id", func(c *fiber.Ctx) error {
		c.Locals(middleware.AccessScopeKey, &entity.AccessScope{
			UserID:           uuid.New(),
			Role:             entity.RoleUnit,
			OrganizationID:   &owner,
			AccessibleOrgIDs: []uuid.UUID{owner},
		})
		return c.Next()
	}, handler.Delete)

	req := httptest.NewRequest(fiber.MethodDelete, "/organization-groups/"+groupID.String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d: %s", resp.StatusCode, payload)
	}
	if groupRepo.lastDeleteID != groupID {
		t.Fatalf("expected delete for %s, got %s", groupID, groupRepo.lastDeleteID)
	}
}
