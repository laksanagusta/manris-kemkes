package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type UPRReportDraftInput struct {
	UPRSemesterInput
	Title           string      `json:"title"`
	WorkingPaperIDs []uuid.UUID `json:"workingPaperIds"`
	EvaluationID    *uuid.UUID  `json:"evaluationId"`
}

type UPRReportDraftSummary struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
	Year  int       `json:"year"`
	Half  int       `json:"semester"`
}

type UPRReportDraft struct {
	OrganizationID uuid.UUID           `json:"organizationId"`
	ID             uuid.UUID           `json:"id"`
	Input          UPRReportDraftInput `json:"input"`
	Revision       int                 `json:"revision"`
	SentID         *uuid.UUID          `json:"sentId"`
}

func (s *UPRWorkflow) listReportDrafts(ctx context.Context, org uuid.UUID) ([]UPRReportDraftSummary, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, payload->>'title', (payload->>'year')::int, (payload->>'semester')::int
		FROM upr_report_drafts WHERE organization_id=$1 AND sent_version_id IS NULL
		ORDER BY updated_at DESC, id`, org)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportDraftSummary])
}

func (s *UPRWorkflow) reportDraftSources(ctx context.Context, org uuid.UUID) ([]UPRReportSource, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id,'working_paper' AS kind,COALESCE(assessment_cycle,'') AS period,code,title,
			COALESCE(observation_cutoff,(completed_at AT TIME ZONE 'Asia/Jakarta')::date)::text AS document_date
		FROM working_papers WHERE org_id=$1 AND status='completed'
		UNION ALL
		SELECT id,'evaluation',period,code,'Evaluasi',COALESCE(report_date,(created_at AT TIME ZONE 'Asia/Jakarta')::date)::text
		FROM evaluations WHERE organization_id=$1 AND status='final'
		ORDER BY document_date DESC NULLS LAST,code,id`, org)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportSource])
}

func (input *UPRReportDraftInput) validate() error {
	input.Title = strings.TrimSpace(input.Title)
	if input.WorkingPaperIDs == nil {
		input.WorkingPaperIDs = []uuid.UUID{}
	}
	if input.Title == "" || len([]rune(input.Title)) > 160 {
		return UPRWorkflowError("Isi judul laporan, maksimal 160 karakter.")
	}
	if _, _, _, err := semesterPeriod(input.UPRSemesterInput); err != nil {
		return err
	}
	if len(input.WorkingPaperIDs) > 50 {
		return UPRWorkflowError("Pilih maksimal 50 KK Pemantauan dan Reviu.")
	}
	seen := make(map[uuid.UUID]bool, len(input.WorkingPaperIDs))
	for _, id := range input.WorkingPaperIDs {
		if id == uuid.Nil || seen[id] {
			return UPRWorkflowError("Daftar KK yang dipilih tidak valid.")
		}
		seen[id] = true
	}
	if len([]rune(strings.TrimSpace(input.Reason))) > 2000 {
		return UPRWorkflowError("Alasan pemilihan profil maksimal 2.000 karakter.")
	}
	return nil
}

func (s *UPRWorkflow) SaveReportDraft(ctx context.Context, org, actor, id uuid.UUID, revision int, input UPRReportDraftInput) (UPRReportDraft, error) {
	if err := input.validate(); err != nil {
		return UPRReportDraft{}, err
	}
	if _, err := selectedReportSources(ctx, s.pool, org, input); err != nil {
		return UPRReportDraft{}, err
	}
	draft := UPRReportDraft{OrganizationID: org, Input: input}
	var err error
	if id == uuid.Nil {
		err = s.pool.QueryRow(ctx, `
			INSERT INTO upr_report_drafts (organization_id, payload, created_by)
			VALUES ($1,$2,$3) RETURNING id,revision`, org, input, actor).Scan(&draft.ID, &draft.Revision)
	} else {
		err = s.pool.QueryRow(ctx, `
			UPDATE upr_report_drafts SET payload=$3, revision=revision+1, updated_at=now()
			WHERE id=$1 AND organization_id=$2 AND sent_version_id IS NULL AND revision=$4
			RETURNING id,revision`, id, org, input, revision).Scan(&draft.ID, &draft.Revision)
		if errors.Is(err, pgx.ErrNoRows) {
			return UPRReportDraft{}, ErrUPRConflict
		}
	}
	return draft, err
}

type reportDraftReader interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

func readReportDraft(ctx context.Context, q reportDraftReader, org, id uuid.UUID, lock bool) (UPRReportDraft, error) {
	query := `SELECT id,payload,revision,sent_version_id FROM upr_report_drafts WHERE id=$1 AND organization_id=$2`
	if lock {
		query += " FOR UPDATE"
	}
	draft := UPRReportDraft{OrganizationID: org}
	var raw json.RawMessage
	err := q.QueryRow(ctx, query, id, org).Scan(&draft.ID, &raw, &draft.Revision, &draft.SentID)
	if errors.Is(err, pgx.ErrNoRows) {
		return draft, ErrUPRNotFound
	}
	if err != nil {
		return draft, err
	}
	return draft, json.Unmarshal(raw, &draft.Input)
}

func (s *UPRWorkflow) GetReportDraft(ctx context.Context, org, id uuid.UUID) (UPRReportDraft, error) {
	return readReportDraft(ctx, s.pool, org, id, false)
}

func (s *UPRWorkflow) PreviewReportDraft(ctx context.Context, org uuid.UUID, input UPRReportDraftInput) (UPRSemesterSnapshot, error) {
	if err := input.validate(); err != nil {
		return UPRSemesterSnapshot{}, err
	}
	if input.ProfileID == nil {
		return UPRSemesterSnapshot{}, UPRWorkflowError("Pilih Profil Risiko Tahunan yang sudah final.")
	}
	semester := input.UPRSemesterInput
	semester.selection = &input
	snapshot, err := s.PreviewSemester(ctx, org, semester)
	if err != nil {
		return snapshot, err
	}
	snapshot.ReviewKey, err = reportDraftReviewKey(snapshot)
	return snapshot, err
}

func selectedReportSources(ctx context.Context, db riskQueryer, org uuid.UUID, input UPRReportDraftInput) ([]UPRSupportingSection, error) {
	type documentKey struct {
		kind string
		id   uuid.UUID
	}
	chosen := make([]documentKey, 0, len(input.WorkingPaperIDs)+2)
	if input.ProfileID != nil {
		chosen = append(chosen, documentKey{"profile", *input.ProfileID})
	}
	for _, id := range input.WorkingPaperIDs {
		chosen = append(chosen, documentKey{"working_paper", id})
	}
	if input.EvaluationID != nil {
		chosen = append(chosen, documentKey{"evaluation", *input.EvaluationID})
	}
	sources := make([]UPRSupportingSection, 0, len(chosen))
	if len(chosen) == 0 {
		return sources, nil
	}
	ids := make([]uuid.UUID, len(chosen))
	for i, key := range chosen {
		ids[i] = key.id
	}
	options, err := reportDocumentOptions(ctx, db, org, "", input.UPRSemesterInput, ids, "", 0, 0)
	if err != nil {
		return nil, err
	}
	available := make(map[documentKey]UPRReportDocumentOption, len(options))
	for _, option := range options {
		available[documentKey{option.Kind, option.ID}] = option
	}
	for _, key := range chosen {
		option, ok := available[key]
		if !ok {
			if key.kind == "profile" {
				return nil, UPRWorkflowError("Pilih versi profil final untuk UPR dan tahun ini.")
			}
			return nil, UPRWorkflowError("Pilih KK Selesai dan Evaluasi Final sesuai unit, versi profil, dan semester laporan.")
		}
		if key.kind != "profile" {
			sources = append(sources, option.supportingSection())
		}
	}
	return sources, nil
}

func reportDraftReviewKey(snapshot UPRSemesterSnapshot) (string, error) {
	raw, err := json.Marshal(snapshot)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

func (s *UPRWorkflow) SendReportDraft(ctx context.Context, org, actor, id uuid.UUID, revision int, reviewKey string) (uuid.UUID, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)
	if err := lockUPROrganization(ctx, tx, org); err != nil {
		return uuid.Nil, err
	}
	draft, err := readReportDraft(ctx, tx, org, id, true)
	if err != nil {
		return uuid.Nil, err
	}
	if draft.SentID != nil {
		return *draft.SentID, nil
	}
	if revision != draft.Revision {
		return uuid.Nil, ErrUPRConflict
	}
	if draft.Input.ProfileID == nil || len(draft.Input.WorkingPaperIDs) == 0 || draft.Input.EvaluationID == nil {
		return uuid.Nil, UPRWorkflowError("Pilih profil final, minimal satu KK Selesai, dan satu Evaluasi Final sebelum mengirim.")
	}
	recipient, err := reportRecipient(ctx, tx, org)
	if err != nil {
		return uuid.Nil, err
	}
	input := draft.Input.UPRSemesterInput
	input.selection = &draft.Input
	period, cutoff, _, err := semesterPeriod(input)
	if err != nil {
		return uuid.Nil, err
	}
	snapshot, err := buildSemester(ctx, tx, org, input)
	if err != nil {
		return uuid.Nil, err
	}
	if err := validateSemesterSnapshot(snapshot, cutoff); err != nil {
		return uuid.Nil, err
	}
	currentKey, err := reportDraftReviewKey(snapshot)
	if err != nil {
		return uuid.Nil, err
	}
	if reviewKey != currentKey {
		return uuid.Nil, UPRWorkflowError("Isi laporan berubah atau belum ditinjau. Muat pratinjau terbaru sebelum mengirim.")
	}
	sentID, err := saveUPRReportVersion(ctx, tx, org, actor, "semester", period, nil, &snapshot.Profile.ID, snapshot, nil)
	if err != nil {
		return uuid.Nil, err
	}
	if err := deliverUPRReport(ctx, tx, sentID, recipient, actor); err != nil {
		return uuid.Nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE upr_report_drafts SET sent_version_id=$2, updated_at=now() WHERE id=$1`, id, sentID); err != nil {
		return uuid.Nil, err
	}
	return sentID, tx.Commit(ctx)
}
