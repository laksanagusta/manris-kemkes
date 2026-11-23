package postgres

import (
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestRiskRelatedRecordsHonorOrganizationScope(t *testing.T) {
	dsn := os.Getenv("RISK_SCOPE_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires a disposable migrated RISK_SCOPE_TEST_DATABASE_URL")
	}
	ctx := t.Context()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	exec := func(query string, args ...any) {
		t.Helper()
		if _, err := tx.Exec(ctx, query, args...); err != nil {
			t.Fatal(err)
		}
	}

	own, other, actor := uuid.New(), uuid.New(), uuid.New()
	ownRisk, otherRisk := uuid.New(), uuid.New()
	exec("INSERT INTO organizations (id,name) VALUES ($1,'Scope A'),($2,'Scope B')", own, other)
	exec("INSERT INTO users (id,name,username,email,password_hash,role,organization_id) VALUES ($1,'Scope tester',$2,$3,'dummy','unit',$4)", actor, actor.String(), actor.String()+"@example.test", own)
	exec(`INSERT INTO risks (id, version_group_id, title, organization_id, created_by)
		VALUES ($1,$1,'Own risk',$2,$5),($3,$3,'Other risk',$4,$5)`,
		ownRisk, own, otherRisk, other, actor)

	otherActor := uuid.New()
	nip := "NIP-" + actor.String()
	exec("UPDATE users SET nip=$1 WHERE id=$2", "  "+nip, actor)
	exec("INSERT INTO users (id,name,username,email,password_hash,role,organization_id) VALUES ($1,'Other tester',$2,$3,'dummy','unit',$4)", otherActor, otherActor.String(), otherActor.String()+"@example.test", other)
	users := &userRepository{pool: tx}
	if user, err := users.GetByNIP(ctx, nip); err != nil || user.ID != actor {
		t.Fatalf("canonical NIP lookup returned %+v, %v", user, err)
	}
	savepoint, err := tx.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	_, err = savepoint.Exec(ctx, "UPDATE users SET nip=$1 WHERE id=$2", nip, otherActor)
	if !errors.Is(userIdentityWriteError(err), domainerrors.ErrNIPAlreadyExists) {
		t.Fatalf("duplicate NIP write returned %v", err)
	}
	if err := savepoint.Rollback(ctx); err != nil {
		t.Fatal(err)
	}

	writeOwn := &entity.AccessScope{UserID: actor, OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own}}
	writeOther := &entity.AccessScope{UserID: actor, OrganizationID: &other, AccessibleOrgIDs: []uuid.UUID{other}}
	readBoth := &entity.AccessScope{UserID: actor, OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own, other}}
	assessments := &likelihoodAssessmentRepository{pool: tx}
	record := &entity.LikelihoodAssessment{
		RiskID: otherRisk, Method: "expert_judgement", FrequencyType: "low_frequency",
		ObservationPeriodMonths: 12, SelectedProbabilityLevel: 2,
	}
	if err := assessments.UpsertByRiskID(ctx, record, writeOther); err != nil {
		t.Fatal(err)
	}
	record.SelectedProbabilityLevel = 3
	if err := assessments.UpsertByRiskID(ctx, record, readBoth); !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("descendant write returned %v", err)
	}
	if _, err := assessments.GetByRiskID(ctx, otherRisk, writeOwn); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatalf("unrelated read returned %v", err)
	}
	if got, err := assessments.GetByRiskID(ctx, otherRisk, readBoth); err != nil || got.SelectedProbabilityLevel != 2 {
		t.Fatalf("authorized read did not preserve stored assessment: %+v, %v", got, err)
	}

	minutes := &meetingMinuteRepository{pool: tx}
	input := entity.CreateMeetingMinuteInput{
		Title: "Scope notes", Date: time.Now(), OrganizationID: &own,
		CreatedBy: actor, Scope: writeOwn, RiskIDs: []uuid.UUID{ownRisk, otherRisk},
	}
	if _, err := minutes.Create(ctx, input); !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("out-of-scope creation returned %v", err)
	}
	input.RiskIDs = []uuid.UUID{ownRisk}
	minute, err := minutes.Create(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	if err := minutes.LinkRisks(ctx, minute.ID, []uuid.UUID{otherRisk}, readBoth); err != nil {
		t.Fatal(err)
	}
	detail, err := minutes.GetByID(ctx, minute.ID, []uuid.UUID{own})
	if err != nil || len(detail.LinkedRisks) != 1 || detail.LinkedRisks[0].RiskID != ownRisk {
		t.Fatalf("linked risk scope did not match the caller: %+v, %v", detail, err)
	}
	linked, err := minutes.ListByRiskID(ctx, otherRisk, []uuid.UUID{other})
	if err != nil || len(linked) != 0 {
		t.Fatalf("reverse lookup revealed an out-of-scope minute: %+v, %v", linked, err)
	}
}
