package organizationgroup

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeOrgGroupRepo struct {
	group             *entity.OrganizationGroup
	groupList         []*entity.OrganizationGroup
	listTotal         int
	lastCreateMembers []uuid.UUID
	lastUpdateMembers []uuid.UUID
	lastListFilter    repository.OrganizationGroupListFilter
	lastDeleteID      uuid.UUID
	lastListMemberID  uuid.UUID
	memberIDs         []uuid.UUID
}

func (r *fakeOrgGroupRepo) Create(_ context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	if r.group == nil {
		group.ID = uuid.New()
	} else {
		group.ID = r.group.ID
	}
	r.group = group
	r.lastCreateMembers = append([]uuid.UUID{}, memberIDs...)
	return nil
}

func (r *fakeOrgGroupRepo) Update(_ context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	r.group = group
	r.lastUpdateMembers = append([]uuid.UUID{}, memberIDs...)
	return nil
}

func (r *fakeOrgGroupRepo) Delete(_ context.Context, id uuid.UUID) error {
	r.lastDeleteID = id
	return nil
}

func (r *fakeOrgGroupRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.OrganizationGroup, error) {
	if r.group == nil || r.group.ID != id {
		return nil, domainerrors.ErrNotFound
	}
	return r.group, nil
}

func (r *fakeOrgGroupRepo) List(_ context.Context, filter repository.OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error) {
	r.lastListFilter = filter
	if r.groupList == nil {
		return []*entity.OrganizationGroup{}, r.listTotal, nil
	}
	return r.groupList, r.listTotal, nil
}

func (r *fakeOrgGroupRepo) ListMemberIDs(_ context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	r.lastListMemberID = id
	return append([]uuid.UUID{}, r.memberIDs...), nil
}

type fakeOrgHierarchyRepo struct {
	descendants []uuid.UUID
	err         error
}

func (r *fakeOrgHierarchyRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *fakeOrgHierarchyRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: id, Name: "Org"}, nil
}
func (r *fakeOrgHierarchyRepo) Update(context.Context, *entity.Organization) error   { return nil }
func (r *fakeOrgHierarchyRepo) Delete(context.Context, uuid.UUID) error              { return nil }
func (r *fakeOrgHierarchyRepo) List(context.Context) ([]*entity.Organization, error) { return nil, nil }
func (r *fakeOrgHierarchyRepo) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *fakeOrgHierarchyRepo) GetContext(context.Context, uuid.UUID) (string, error) { return "", nil }
func (r *fakeOrgHierarchyRepo) GetDescendants(_ context.Context, _ uuid.UUID) ([]uuid.UUID, error) {
	return append([]uuid.UUID{}, r.descendants...), r.err
}

func scopeFor(owner uuid.UUID, readable ...uuid.UUID) *entity.AccessScope {
	return &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             entity.RoleUnit,
		OrganizationID:   &owner,
		AccessibleOrgIDs: readable,
	}
}

func TestCreateRejectsBlankName(t *testing.T) {
	owner := uuid.New()
	orgRepo := &fakeOrgHierarchyRepo{descendants: []uuid.UUID{owner}}
	uc := NewCreateUseCase(&fakeOrgGroupRepo{}, orgRepo)

	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID: owner,
		Name:                "   ",
		Scope:               scopeFor(owner, owner),
	})
	if !errors.Is(err, domainerrors.ErrInvalidName) {
		t.Fatalf("expected invalid name, got %v", err)
	}
}

func TestCreateRejectsMemberOutsideDescendants(t *testing.T) {
	owner := uuid.New()
	member := uuid.New()
	orgRepo := &fakeOrgHierarchyRepo{descendants: []uuid.UUID{owner}}
	uc := NewCreateUseCase(&fakeOrgGroupRepo{}, orgRepo)

	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID:   owner,
		Name:                  "Jawa Timur",
		MemberOrganizationIDs: []uuid.UUID{member},
		Scope:                 scopeFor(owner, owner, member),
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreateAllowsOverlappingMembersAcrossGroups(t *testing.T) {
	owner := uuid.New()
	member := uuid.New()
	orgRepo := &fakeOrgHierarchyRepo{descendants: []uuid.UUID{owner, member}}
	repo := &fakeOrgGroupRepo{}
	uc := NewCreateUseCase(repo, orgRepo)

	if _, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID:   owner,
		Name:                  "Group A",
		MemberOrganizationIDs: []uuid.UUID{member},
		Scope:                 scopeFor(owner, owner, member),
	}); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if _, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID:   owner,
		Name:                  "Group B",
		MemberOrganizationIDs: []uuid.UUID{member},
		Scope:                 scopeFor(owner, owner, member),
	}); err != nil {
		t.Fatalf("expected overlapping membership to be allowed, got %v", err)
	}
	if len(repo.lastCreateMembers) != 1 || repo.lastCreateMembers[0] != member {
		t.Fatalf("expected member %s, got %v", member, repo.lastCreateMembers)
	}
}

func TestCreateRejectsOwnerAsMember(t *testing.T) {
	owner := uuid.New()
	orgRepo := &fakeOrgHierarchyRepo{descendants: []uuid.UUID{owner}}
	uc := NewCreateUseCase(&fakeOrgGroupRepo{}, orgRepo)

	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID:   owner,
		Name:                  "Owner Included",
		MemberOrganizationIDs: []uuid.UUID{owner},
		Scope:                 scopeFor(owner, owner),
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreateRejectsAnotherOwnerGroup(t *testing.T) {
	owner := uuid.New()
	other := uuid.New()
	orgRepo := &fakeOrgHierarchyRepo{descendants: []uuid.UUID{owner}}
	uc := NewCreateUseCase(&fakeOrgGroupRepo{}, orgRepo)

	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID: owner,
		Name:                "Forbidden",
		Scope:               scopeFor(other, other),
	})
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestListDefaultsToOwnOrganizationForNonGlobalScope(t *testing.T) {
	owner := uuid.New()
	repo := &fakeOrgGroupRepo{groupList: []*entity.OrganizationGroup{}, listTotal: 0}
	uc := NewListUseCase(repo)

	out, err := uc.Execute(context.Background(), ListInput{
		Scope: scopeFor(owner, owner),
		Page:  0,
		Limit: 0,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.lastListFilter.OwnerOrganizationID == nil || *repo.lastListFilter.OwnerOrganizationID != owner {
		t.Fatalf("expected owner filter %s, got %v", owner, repo.lastListFilter.OwnerOrganizationID)
	}
	if out.Page != 1 || out.Limit != 10 {
		t.Fatalf("expected normalized pagination 1/10, got %d/%d", out.Page, out.Limit)
	}
}

func TestListRejectsCrossOwnerFilterForNonGlobalScope(t *testing.T) {
	owner := uuid.New()
	other := uuid.New()
	repo := &fakeOrgGroupRepo{groupList: []*entity.OrganizationGroup{}, listTotal: 0}
	uc := NewListUseCase(repo)

	_, err := uc.Execute(context.Background(), ListInput{
		OwnerOrganizationID: &other,
		Scope:               scopeFor(owner, owner),
	})
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestGetRejectsForeignOwner(t *testing.T) {
	owner := uuid.New()
	foreign := uuid.New()
	groupID := uuid.New()
	repo := &fakeOrgGroupRepo{group: &entity.OrganizationGroup{ID: groupID, OwnerOrganizationID: foreign, Name: "Foreign"}}
	uc := NewGetUseCase(repo)

	_, err := uc.Execute(context.Background(), GetInput{ID: groupID, Scope: scopeFor(owner, owner)})
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestDeleteReturnsMessageAndRejectsForeignOwner(t *testing.T) {
	owner := uuid.New()
	foreign := uuid.New()
	groupID := uuid.New()
	repo := &fakeOrgGroupRepo{group: &entity.OrganizationGroup{ID: groupID, OwnerOrganizationID: owner, Name: "Jawa Timur"}}
	uc := NewDeleteUseCase(repo)

	out, err := uc.Execute(context.Background(), DeleteInput{ID: groupID, Scope: scopeFor(owner, owner)})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if out == nil || out.Message == "" {
		t.Fatal("expected message output")
	}
	if repo.lastDeleteID != groupID {
		t.Fatalf("expected delete of %s, got %s", groupID, repo.lastDeleteID)
	}

	repo.group = &entity.OrganizationGroup{ID: groupID, OwnerOrganizationID: foreign, Name: "Foreign"}
	_, err = uc.Execute(context.Background(), DeleteInput{ID: groupID, Scope: scopeFor(owner, owner)})
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestResolveReturnsMembersOnlyAndEmptySlice(t *testing.T) {
	owner := uuid.New()
	groupID := uuid.New()
	member := uuid.New()
	repo := &fakeOrgGroupRepo{
		group:     &entity.OrganizationGroup{ID: groupID, OwnerOrganizationID: owner, Name: "Jawa Timur"},
		memberIDs: []uuid.UUID{member},
	}
	uc := NewResolveUseCase(repo)

	got, err := uc.Execute(context.Background(), ResolveInput{GroupID: groupID, Scope: scopeFor(owner, owner, member)})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(got) != 1 || got[0] != member {
		t.Fatalf("expected members only [%s], got %v", member, got)
	}

	repo.memberIDs = nil
	got, err = uc.Execute(context.Background(), ResolveInput{GroupID: groupID, Scope: scopeFor(owner, owner)})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got == nil || len(got) != 0 {
		t.Fatalf("expected empty non-nil slice, got %v", got)
	}
}
