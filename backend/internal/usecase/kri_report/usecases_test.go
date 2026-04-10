package kri_report

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type fakeKRIReportRepo struct {
	reports              map[uuid.UUID]*entity.KRIReport
	kris                 []*entity.KRI
	semesterSummaryRows  []*entity.KRISemesterSummaryRow
	semesterSummaryInput struct {
		RiskVersionGroupID uuid.UUID
		SourceCycle        string
	}
}

func (f *fakeKRIReportRepo) Create(ctx context.Context, report *entity.KRIReport) error {
	if report.ID == uuid.Nil {
		report.ID = uuid.New()
	}
	f.reports[report.ID] = report
	return nil
}

func (f *fakeKRIReportRepo) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.KRIReport, error) {
	report, ok := f.reports[id]
	if !ok {
		return nil, context.Canceled
	}
	clone := *report
	return &clone, nil
}

func (f *fakeKRIReportRepo) Update(ctx context.Context, report *entity.KRIReport) error {
	clone := *report
	f.reports[report.ID] = &clone
	return nil
}

func (f *fakeKRIReportRepo) ListByKRI(ctx context.Context, kriID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.KRIReport, error) {
	var out []*entity.KRIReport
	for _, rpt := range f.reports {
		if rpt.KRIID == kriID {
			clone := *rpt
			out = append(out, &clone)
		}
	}
	return out, nil
}

func (f *fakeKRIReportRepo) ListByUser(ctx context.Context, userID uuid.UUID, status string, orgIDs []uuid.UUID) ([]*entity.KRIReport, error) {
	var out []*entity.KRIReport
	for _, rpt := range f.reports {
		if rpt.SubmittedBy != nil && *rpt.SubmittedBy == userID {
			if status == "" || status == "all" || rpt.Status == status {
				clone := *rpt
				out = append(out, &clone)
			}
		}
	}
	return out, nil
}

func (f *fakeKRIReportRepo) ListByStatus(ctx context.Context, status string, orgIDs []uuid.UUID) ([]*entity.KRIReport, error) {
	var out []*entity.KRIReport
	for _, rpt := range f.reports {
		if status == "" || status == "all" || rpt.Status == status {
			clone := *rpt
			out = append(out, &clone)
		}
	}
	return out, nil
}

func (f *fakeKRIReportRepo) ListReviewQueue(ctx context.Context, status string) ([]*entity.KRIReport, error) {
	var out []*entity.KRIReport
	for _, rpt := range f.reports {
		targetStatus := status
		if targetStatus == "" || targetStatus == "all" {
			targetStatus = "submitted"
		}
		if rpt.Status == targetStatus {
			clone := *rpt
			out = append(out, &clone)
		}
	}
	return out, nil
}

func (f *fakeKRIReportRepo) ListPendingOverdue(ctx context.Context, referenceDate time.Time) ([]*entity.KRIReport, error) {
	var out []*entity.KRIReport
	for _, rpt := range f.reports {
		if rpt.Status != "pending" && rpt.Status != "revision_requested" {
			continue
		}
		dueDate, err := time.Parse("2006-01-02", rpt.DueDate)
		if err != nil {
			continue
		}
		if dueDate.Before(referenceDate) {
			clone := *rpt
			out = append(out, &clone)
		}
	}
	return out, nil
}

func (f *fakeKRIReportRepo) ReportExistsForPeriod(ctx context.Context, kriID uuid.UUID, periodStart, periodEnd string) (bool, error) {
	for _, rpt := range f.reports {
		if rpt.KRIID == kriID && rpt.PeriodStart == periodStart && rpt.PeriodEnd == periodEnd {
			return true, nil
		}
	}
	return false, nil
}

func (f *fakeKRIReportRepo) GetAllKRIs(ctx context.Context) ([]*entity.KRI, error) {
	return f.kris, nil
}

func (f *fakeKRIReportRepo) ListSemesterSummaryRows(ctx context.Context, riskVersionGroupID uuid.UUID, sourceCycle string) ([]*entity.KRISemesterSummaryRow, error) {
	f.semesterSummaryInput.RiskVersionGroupID = riskVersionGroupID
	f.semesterSummaryInput.SourceCycle = sourceCycle

	rows := make([]*entity.KRISemesterSummaryRow, 0, len(f.semesterSummaryRows))
	for _, row := range f.semesterSummaryRows {
		if row == nil {
			continue
		}
		clone := *row
		if row.LatestAcceptedValue != nil {
			value := *row.LatestAcceptedValue
			clone.LatestAcceptedValue = &value
		}
		rows = append(rows, &clone)
	}
	return rows, nil
}

type fakeKRIRepo struct {
	kris        map[uuid.UUID]*entity.KRI
	updateCalls int
	errOnGet    error
	errOnUpdate error
}

func openSubmissionWindowPeriodEnd(t *testing.T) string {
	t.Helper()

	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		t.Fatalf("failed to load Asia/Jakarta timezone: %v", err)
	}

	return time.Now().In(loc).AddDate(0, 0, -2).Format("2006-01-02")
}

func (f *fakeKRIRepo) Create(ctx context.Context, kri *entity.KRI) error {
	f.kris[kri.ID] = kri
	return nil
}

func (f *fakeKRIRepo) GetByID(ctx context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.KRI, error) {
	if f.errOnGet != nil {
		return nil, f.errOnGet
	}
	kri, ok := f.kris[id]
	if !ok {
		return nil, context.Canceled
	}
	clone := *kri
	return &clone, nil
}

func (f *fakeKRIRepo) Update(ctx context.Context, kri *entity.KRI) error {
	f.updateCalls++
	if f.errOnUpdate != nil {
		return f.errOnUpdate
	}
	clone := *kri
	f.kris[kri.ID] = &clone
	return nil
}

func (f *fakeKRIRepo) Archive(ctx context.Context, id uuid.UUID, reason string) error {
	return nil
}

func (f *fakeKRIRepo) List(ctx context.Context, orgIDs []uuid.UUID, includeArchived bool) ([]*entity.KRI, error) {
	var out []*entity.KRI
	for _, kri := range f.kris {
		clone := *kri
		out = append(out, &clone)
	}
	return out, nil
}

func (f *fakeKRIRepo) GetDashboard(ctx context.Context, orgIDs []uuid.UUID) (map[string]any, error) {
	return map[string]any{}, nil
}

func (f *fakeKRIRepo) Delete(ctx context.Context, id uuid.UUID) error {
	delete(f.kris, id)
	return nil
}

func TestAcceptKRIReportUpdatesCurrentValue(t *testing.T) {
	reportID := uuid.New()
	kriID := uuid.New()
	reviewerID := uuid.New()
	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		reportID: {
			ID: reportID, KRIID: kriID, Status: "submitted", DueDate: "2026-04-01",
			Value: ptrFloat(15.3),
		},
	}}
	kriRepo := &fakeKRIRepo{kris: map[uuid.UUID]*entity.KRI{kriID: {ID: kriID}}}

	uc := NewAcceptReportUseCase(repo, kriRepo)
	out, err := uc.Execute(context.Background(), AcceptReportInput{ReportID: reportID, ReviewedBy: reviewerID, ReviewNote: "looks good"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if out.Status != "accepted" {
		t.Fatalf("expected accepted, got %s", out.Status)
	}
	if out.ReviewedBy == nil || *out.ReviewedBy != reviewerID {
		t.Fatalf("expected reviewed_by set")
	}
	if out.ReviewedAt == nil {
		t.Fatalf("expected reviewed_at set")
	}
	updatedKRI, _ := kriRepo.GetByID(context.Background(), kriID, nil)
	if updatedKRI.CurrentValue != 15.3 {
		t.Fatalf("expected KRI current value updated to 15.3, got %v", updatedKRI.CurrentValue)
	}
	if kriRepo.updateCalls != 1 {
		t.Fatalf("expected one KRI update call on accept, got %d", kriRepo.updateCalls)
	}
}

func TestAcceptKRIReportRollsBackWhenKRIUpdateFails(t *testing.T) {
	reportID := uuid.New()
	kriID := uuid.New()
	reviewerID := uuid.New()
	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		reportID: {
			ID: reportID, KRIID: kriID, Status: "submitted", DueDate: "2026-04-01",
			Value: ptrFloat(15.3),
		},
	}}
	kriRepo := &fakeKRIRepo{
		kris:        map[uuid.UUID]*entity.KRI{kriID: {ID: kriID}},
		errOnUpdate: errors.New("db write failed"),
	}

	uc := NewAcceptReportUseCase(repo, kriRepo)
	_, err := uc.Execute(context.Background(), AcceptReportInput{ReportID: reportID, ReviewedBy: reviewerID, ReviewNote: "looks good"})
	if err == nil {
		t.Fatalf("expected error when KRI update fails")
	}
	if !strings.Contains(err.Error(), "update kri after accepting report") {
		t.Fatalf("expected KRI update error, got %v", err)
	}

	stored, getErr := repo.GetByID(context.Background(), reportID, nil)
	if getErr != nil {
		t.Fatalf("expected report to remain retrievable, got %v", getErr)
	}
	if stored.Status != "submitted" {
		t.Fatalf("expected report status rolled back to submitted, got %s", stored.Status)
	}
	if stored.ReviewedBy != nil || stored.ReviewedAt != nil || stored.ReviewNote != "" {
		t.Fatalf("expected reviewer metadata rolled back after KRI update failure")
	}
}

func TestSubmitDoesNotUpdateCurrentValue(t *testing.T) {
	reportID := uuid.New()
	kriID := uuid.New()
	submitterID := uuid.New()
	periodEnd := openSubmissionWindowPeriodEnd(t)

	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		reportID: {
			ID: reportID, KRIID: kriID, Status: "pending", DueDate: "2026-04-01", PeriodEnd: periodEnd,
		},
	}}
	kriRepo := &fakeKRIRepo{kris: map[uuid.UUID]*entity.KRI{kriID: {ID: kriID, CurrentValue: 42.0}}}

	uc := NewSubmitReportUseCase(repo, kriRepo)
	out, err := uc.Execute(context.Background(), SubmitReportInput{
		ReportID:    reportID,
		Value:       15.3,
		Notes:       "submitted",
		EvidenceURL: "https://example.com/evidence",
		SubmittedBy: submitterID,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if out.Status != "submitted" {
		t.Fatalf("expected submitted status, got %s", out.Status)
	}

	updatedKRI, _ := kriRepo.GetByID(context.Background(), kriID, nil)
	if updatedKRI.CurrentValue != 42.0 {
		t.Fatalf("expected KRI current value unchanged after submit, got %v", updatedKRI.CurrentValue)
	}
	if kriRepo.updateCalls != 0 {
		t.Fatalf("expected no KRI update calls on submit, got %d", kriRepo.updateCalls)
	}
}

func TestGenerateReportsIsIdempotent(t *testing.T) {
	kriID := uuid.New()
	repo := &fakeKRIReportRepo{
		reports: map[uuid.UUID]*entity.KRIReport{},
		kris: []*entity.KRI{
			{ID: kriID, Frequency: "bulanan", IsArchived: false},
		},
	}

	uc := NewGenerateReportsUseCase(repo)
	now := time.Date(2026, 4, 1, 9, 0, 0, 0, time.UTC)

	createdFirst, err := uc.Execute(context.Background(), now)
	if err != nil {
		t.Fatalf("first generation should not fail: %v", err)
	}
	createdSecond, err := uc.Execute(context.Background(), now)
	if err != nil {
		t.Fatalf("second generation should not fail: %v", err)
	}

	if createdFirst != 1 {
		t.Fatalf("expected first run to create 1 report, got %d", createdFirst)
	}
	if createdSecond != 0 {
		t.Fatalf("expected second run to create 0 reports, got %d", createdSecond)
	}

	if len(repo.reports) != 1 {
		t.Fatalf("expected exactly one report row for same kri-period pair, got %d", len(repo.reports))
	}
}

func TestGenerateReportsSkipsWhenPeriodNotOpen(t *testing.T) {
	repo := &fakeKRIReportRepo{
		reports: map[uuid.UUID]*entity.KRIReport{},
		kris: []*entity.KRI{
			{ID: uuid.New(), Frequency: "mingguan", IsArchived: false},
			{ID: uuid.New(), Frequency: "bulanan", IsArchived: false},
		},
	}

	uc := NewGenerateReportsUseCase(repo)
	now := time.Date(2026, 4, 2, 9, 0, 0, 0, time.UTC)

	created, err := uc.Execute(context.Background(), now)
	if err != nil {
		t.Fatalf("generation should not fail: %v", err)
	}
	if created != 0 {
		t.Fatalf("expected no reports created when period not open, got %d", created)
	}
}

func TestSubmitRevisionRequestedReportSucceeds(t *testing.T) {
	reportID := uuid.New()
	kriID := uuid.New()
	submitterID := uuid.New()
	periodEnd := openSubmissionWindowPeriodEnd(t)

	reviewedBy := uuid.New()
	reviewedAt := time.Now()
	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		reportID: {
			ID:         reportID,
			KRIID:      kriID,
			Status:     "revision_requested",
			PeriodEnd:  periodEnd,
			DueDate:    "2026-04-01",
			ReviewedBy: &reviewedBy,
			ReviewedAt: &reviewedAt,
			ReviewNote: "please revise",
		},
	}}
	kriRepo := &fakeKRIRepo{kris: map[uuid.UUID]*entity.KRI{kriID: {ID: kriID, CurrentValue: 10.0}}}

	uc := NewSubmitReportUseCase(repo, kriRepo)
	out, err := uc.Execute(context.Background(), SubmitReportInput{
		ReportID:    reportID,
		Value:       19.8,
		Notes:       "revised",
		EvidenceURL: "https://example.com/revision",
		SubmittedBy: submitterID,
	})
	if err != nil {
		t.Fatalf("expected revision resubmit to succeed, got %v", err)
	}
	if out.Status != "submitted" {
		t.Fatalf("expected submitted status after resubmit, got %s", out.Status)
	}
	if out.ReviewedBy != nil || out.ReviewedAt != nil || out.ReviewNote != "" {
		t.Fatalf("expected review metadata reset after resubmit")
	}
}

func TestAcceptKRIReportDoesNotMutateRisk(t *testing.T) {
	reportID := uuid.New()
	kriID := uuid.New()
	riskID := uuid.New()
	reviewerID := uuid.New()

	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		reportID: {
			ID: reportID, KRIID: kriID, Status: "submitted", DueDate: "2026-04-01",
			Value: ptrFloat(11.2),
		},
	}}

	kriRepo := &fakeKRIRepo{kris: map[uuid.UUID]*entity.KRI{kriID: {
		ID:         kriID,
		RiskID:     riskID,
		RiskCode:   "R-001",
		RiskTitle:  "Operational",
		Name:       "KRI A",
		Frequency:  "bulanan",
		IsArchived: false,
	}}}

	before, _ := kriRepo.GetByID(context.Background(), kriID, nil)
	_, err := NewAcceptReportUseCase(repo, kriRepo).Execute(context.Background(), AcceptReportInput{ReportID: reportID, ReviewedBy: reviewerID})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	after, _ := kriRepo.GetByID(context.Background(), kriID, nil)

	if before.RiskID != after.RiskID || before.RiskCode != after.RiskCode || before.RiskTitle != after.RiskTitle {
		t.Fatalf("expected accept to not mutate linked risk metadata")
	}
}

func TestListReportsComputesOverdueMetadata(t *testing.T) {
	kriID := uuid.New()
	overdueID := uuid.New()
	nonOverdueID := uuid.New()
	submittedID := uuid.New()
	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		overdueID: {
			ID: overdueID, KRIID: kriID, Status: "pending", DueDate: "2000-01-01",
		},
		nonOverdueID: {
			ID: nonOverdueID, KRIID: kriID, Status: "revision_requested", DueDate: "2999-01-01",
		},
		submittedID: {
			ID: submittedID, KRIID: kriID, Status: "submitted", DueDate: "2000-01-01",
		},
	}}

	uc := NewListReportsUseCase(repo, &fakeKRIRepo{kris: map[uuid.UUID]*entity.KRI{kriID: {ID: kriID}}})
	reports, err := uc.Execute(context.Background(), ListReportsInput{KRIID: &kriID})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	seen := map[uuid.UUID]bool{}
	for _, report := range reports {
		switch report.ID {
		case overdueID:
			seen[overdueID] = true
			if !report.IsOverdue {
				t.Fatalf("expected pending report past due date to be computed overdue")
			}
		case nonOverdueID:
			seen[nonOverdueID] = true
			if report.IsOverdue {
				t.Fatalf("expected future revision-requested report to not be overdue")
			}
		case submittedID:
			seen[submittedID] = true
			if report.IsOverdue {
				t.Fatalf("expected submitted report to not be overdue computed state")
			}
		}
	}

	if !seen[overdueID] || !seen[nonOverdueID] || !seen[submittedID] {
		t.Fatalf("expected all reports to be returned with metadata")
	}
}

func TestAcceptSkippedKRIReportFails(t *testing.T) {
	reportID := uuid.New()
	reviewerID := uuid.New()
	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		reportID: {ID: reportID, KRIID: uuid.New(), Status: "skipped", DueDate: "2026-04-01"},
	}}
	kriRepo := &fakeKRIRepo{kris: map[uuid.UUID]*entity.KRI{}}

	uc := NewAcceptReportUseCase(repo, kriRepo)
	_, err := uc.Execute(context.Background(), AcceptReportInput{ReportID: reportID, ReviewedBy: reviewerID})
	if err == nil {
		t.Fatalf("expected error")
	}
	if !strings.Contains(err.Error(), "cannot accept report with status 'skipped'") {
		t.Fatalf("expected explicit transition error, got %v", err)
	}

	stored, _ := repo.GetByID(context.Background(), reportID, nil)
	if stored.Status != "skipped" {
		t.Fatalf("expected status unchanged, got %s", stored.Status)
	}
}

func TestRequestRevisionRequiresNote(t *testing.T) {
	reportID := uuid.New()
	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		reportID: {ID: reportID, KRIID: uuid.New(), Status: "submitted", DueDate: "2026-04-01"},
	}}

	uc := NewRequestRevisionUseCase(repo, &fakeKRIRepo{kris: map[uuid.UUID]*entity.KRI{}})
	_, err := uc.Execute(context.Background(), RequestRevisionInput{ReportID: reportID, ReviewedBy: uuid.New(), ReviewNote: "   "})
	if err == nil {
		t.Fatalf("expected error")
	}
	if !strings.Contains(err.Error(), "review_note is required") {
		t.Fatalf("expected review note validation error, got %v", err)
	}
}

func TestSkipRequiresReason(t *testing.T) {
	reportID := uuid.New()
	repo := &fakeKRIReportRepo{reports: map[uuid.UUID]*entity.KRIReport{
		reportID: {ID: reportID, KRIID: uuid.New(), Status: "pending", DueDate: "2026-04-01"},
	}}

	uc := NewSkipReportUseCase(repo, &fakeKRIRepo{kris: map[uuid.UUID]*entity.KRI{}})
	_, err := uc.Execute(context.Background(), SkipReportInput{ReportID: reportID, SubmittedBy: uuid.New(), SkipReason: "   "})
	if err == nil {
		t.Fatalf("expected error")
	}
	if !strings.Contains(err.Error(), "skip_reason is required") {
		t.Fatalf("expected skip reason validation error, got %v", err)
	}
}

func TestRoleEnforcement(t *testing.T) {
	if !CanSubmitOrSkip("unit") || !CanSubmitOrSkip("super_admin") {
		t.Fatalf("unit and super_admin must be allowed to submit/skip")
	}
	if CanSubmitOrSkip("reviewer") || CanSubmitOrSkip("pimpinan") {
		t.Fatalf("reviewer and pimpinan must not be allowed to submit/skip")
	}
	if !CanReview("reviewer") || !CanReview("super_admin") {
		t.Fatalf("reviewer and super_admin must be allowed to review")
	}
	if CanReview("unit") || CanReview("pimpinan") {
		t.Fatalf("unit and pimpinan must not be allowed to review")
	}
}

func ptrFloat(v float64) *float64 {
	return &v
}
