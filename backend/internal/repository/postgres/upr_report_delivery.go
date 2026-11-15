package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/timeutil"
)

type UPRReportRecord struct {
	ID                 uuid.UUID  `json:"id"`
	Kind               string     `json:"kind"`
	Title              string     `json:"title,omitempty"`
	Period             string     `json:"period"`
	Version            int        `json:"version"`
	PreviousVersionID  *uuid.UUID `json:"previousVersionId"`
	FinalizedAt        time.Time  `json:"finalizedAt"`
	OrganizationID     uuid.UUID  `json:"organizationId"`
	Organization       string     `json:"organization"`
	DeliveryID         *uuid.UUID `json:"deliveryId"`
	PreviousDeliveryID *uuid.UUID `json:"previousDeliveryId"`
	RecipientID        *uuid.UUID `json:"recipientId"`
	Recipient          *string    `json:"recipient"`
	SentAt             *time.Time `json:"sentAt"`
	SentBy             *uuid.UUID `json:"sentBy"`
	SenderName         *string    `json:"senderName"`
	Resolution         *string    `json:"resolution"`
	ResolvedAt         *time.Time `json:"resolvedAt"`
	ResolvedBy         *uuid.UUID `json:"resolvedBy"`
	ResolverName       *string    `json:"resolverName"`
	Note               *string    `json:"note"`
}

type UPRReportDetail struct {
	UPRReportRecord
	Snapshot json.RawMessage `json:"snapshot"`
}

type UPRReportSource struct {
	ID           uuid.UUID `json:"id"`
	Kind         string    `json:"kind"`
	Period       string    `json:"period"`
	Code         string    `json:"code"`
	Title        string    `json:"title"`
	DocumentDate *string   `json:"documentDate"`
}

type UPRReportWorkspace struct {
	Drafts      []UPRReportDraftSummary `json:"drafts"`
	HasChildren bool                    `json:"hasChildren"`
	Incoming    []UPRReportRecord       `json:"incoming"`
	Outgoing    []UPRReportRecord       `json:"outgoing"`
	Sources     []UPRReportSource       `json:"sources"`
	Recipient   *string                 `json:"recipient"`
}

const uprReportColumns = `v.id,v.kind,CASE WHEN v.kind='semester' THEN COALESCE(v.snapshot->>'title','') ELSE '' END,v.period,v.version,v.previous_version_id,v.finalized_at,v.organization_id,sender.name,
	d.id,d.previous_delivery_id,d.recipient_organization_id,receiver.name,d.sent_at,d.sent_by,COALESCE(s.name,s.username),
	d.resolution,d.resolved_at,d.resolved_by,COALESCE(a.name,a.username),d.note`

const uprReportFrom = ` FROM upr_report_versions v JOIN organizations sender ON sender.id=v.organization_id
	LEFT JOIN upr_report_deliveries d ON d.report_version_id=v.id
	LEFT JOIN organizations receiver ON receiver.id=d.recipient_organization_id
	LEFT JOIN users s ON s.id=d.sent_by LEFT JOIN users a ON a.id=d.resolved_by `

func (s *UPRWorkflow) ReportWorkspace(ctx context.Context, org uuid.UUID, includeSources bool) (UPRReportWorkspace, error) {
	var result UPRReportWorkspace
	if err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (SELECT 1 FROM organizations WHERE parent_id = $1)
	`, org).Scan(&result.HasChildren); err != nil {
		return result, fmt.Errorf("check report organization children: %w", err)
	}
	rows, err := s.pool.Query(ctx, `SELECT `+uprReportColumns+uprReportFrom+` WHERE d.recipient_organization_id=$1 ORDER BY d.sent_at DESC,v.id`, org)
	if err != nil {
		return result, err
	}
	result.Incoming, err = pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportRecord])
	if err != nil {
		return result, err
	}
	rows, err = s.pool.Query(ctx, `SELECT `+uprReportColumns+uprReportFrom+` WHERE v.organization_id=$1 ORDER BY v.finalized_at DESC,v.version DESC,v.id`, org)
	if err != nil {
		return result, err
	}
	result.Outgoing, err = pgx.CollectRows(rows, pgx.RowToStructByPos[UPRReportRecord])
	if err != nil {
		return result, err
	}
	var parent string
	err = s.pool.QueryRow(ctx, `SELECT parent.name FROM organizations child JOIN organizations parent ON parent.id=child.parent_id
		WHERE child.id=$1 AND child.upr_level='upr_t2' AND parent.upr_level='upr_t1'`, org).Scan(&parent)
	if err == nil {
		result.Recipient = &parent
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return result, err
	}
	err = nil
	result.Drafts, err = s.listReportDrafts(ctx, org)
	if err != nil {
		return result, err
	}
	result.Sources = []UPRReportSource{}
	if includeSources {
		result.Sources, err = s.reportDraftSources(ctx, org)
	}
	return result, err
}

func (s *UPRWorkflow) ReportDetail(ctx context.Context, org, id uuid.UUID) (UPRReportDetail, error) {
	var detail UPRReportDetail
	r := &detail.UPRReportRecord
	var recipientPrevious *uuid.UUID
	err := s.pool.QueryRow(ctx, `SELECT `+uprReportColumns+`,v.snapshot,
		(SELECT earlier.report_version_id FROM upr_report_deliveries earlier WHERE earlier.id=d.previous_delivery_id
		AND earlier.recipient_organization_id=$1)`+uprReportFrom+`
		WHERE v.id=$2 AND (v.organization_id=$1 OR d.recipient_organization_id=$1)`, org, id).Scan(
		&r.ID, &r.Kind, &r.Title, &r.Period, &r.Version, &r.PreviousVersionID, &r.FinalizedAt, &r.OrganizationID, &r.Organization,
		&r.DeliveryID, &r.PreviousDeliveryID, &r.RecipientID, &r.Recipient, &r.SentAt, &r.SentBy, &r.SenderName,
		&r.Resolution, &r.ResolvedAt, &r.ResolvedBy, &r.ResolverName, &r.Note, &detail.Snapshot, &recipientPrevious)
	if errors.Is(err, pgx.ErrNoRows) {
		return detail, ErrUPRNotFound
	}
	if err == nil && r.OrganizationID != org {
		r.PreviousVersionID = recipientPrevious
	}
	return detail, err
}

type uprReplacement struct {
	deliveryID  uuid.UUID
	recipientID uuid.UUID
}

// The caller serializes numbering on the source organization row.
func saveUPRReportVersion(ctx context.Context, tx pgx.Tx, org, actor uuid.UUID, kind, period string, source, profile *uuid.UUID, snapshot any, replacement *uprReplacement) (uuid.UUID, error) {
	var id, previous uuid.UUID
	var ancestor *uuid.UUID
	var version int
	var equal bool
	raw, err := json.Marshal(snapshot)
	if err != nil {
		return id, err
	}
	err = tx.QueryRow(ctx, `SELECT id,version,previous_version_id,snapshot=$5::jsonb FROM upr_report_versions
		WHERE organization_id=$1 AND kind=$2 AND source_id IS NOT DISTINCT FROM $4::uuid
		AND ($4::uuid IS NOT NULL OR period=$3)
		ORDER BY version DESC LIMIT 1`, org, kind, period, source, raw).Scan(&previous, &version, &ancestor, &equal)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return id, err
	}
	if replacement != nil {
		var corrected uuid.UUID
		var correctedVersion int
		var successor *uuid.UUID
		err = tx.QueryRow(ctx, `SELECT v.id,v.version,(SELECT next.report_version_id FROM upr_report_deliveries next WHERE next.previous_delivery_id=d.id LIMIT 1)
			FROM upr_report_deliveries d JOIN upr_report_versions v ON v.id=d.report_version_id
			WHERE d.id=$1 AND d.recipient_organization_id=$2 AND v.organization_id=$3
			AND v.kind=$4 AND v.period=$5 AND d.resolution='changes_requested'`,
			replacement.deliveryID, replacement.recipientID, org, kind, period).Scan(&corrected, &correctedVersion, &successor)
		if errors.Is(err, pgx.ErrNoRows) {
			return id, UPRWorkflowError("Pilih permintaan perbaikan yang sesuai dengan jenis dan periode dokumen.")
		}
		if err != nil {
			return id, err
		}
		if equal && ancestor != nil && *ancestor == corrected {
			return previous, nil
		}
		if successor != nil || (previous != uuid.Nil && (previous != corrected || equal)) {
			return id, UPRWorkflowError("Pilih dokumen baru atau versi yang sudah diperbaiki untuk kiriman ini.")
		}
		previous, version = corrected, correctedVersion
	}
	if equal {
		return previous, nil
	}
	err = tx.QueryRow(ctx, `INSERT INTO upr_report_versions(organization_id,kind,period,source_id,profile_version_id,version,previous_version_id,snapshot,finalized_by,finalized_at)
		VALUES($1,$2,$3,$4,$5,$6,NULLIF($7::uuid,$8::uuid),$9,$10,$11) RETURNING id`, org, kind, period, source, profile, version+1, previous, uuid.Nil, raw, actor, timeutil.BusinessNow().UTC()).Scan(&id)
	return id, err
}

func insertUPRReportVersion(ctx context.Context, tx pgx.Tx, org, actor uuid.UUID, kind, period string, source, profile *uuid.UUID, snapshot any) (uuid.UUID, error) {
	id, err := saveUPRReportVersion(ctx, tx, org, actor, kind, period, source, profile, snapshot, nil)
	if err != nil {
		return uuid.Nil, err
	}
	return id, tx.Commit(ctx)
}

func (s *UPRWorkflow) SendUPRReport(ctx context.Context, org, actor, id uuid.UUID, kind string, previousDeliveryID *uuid.UUID) (uuid.UUID, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)
	if err = lockUPROrganization(ctx, tx, org); err != nil {
		return uuid.Nil, err
	}
	recipient, err := reportRecipient(ctx, tx, org)
	if err != nil {
		return uuid.Nil, err
	}
	var replacement *uprReplacement
	if previousDeliveryID != nil {
		replacement = &uprReplacement{deliveryID: *previousDeliveryID, recipientID: recipient}
	}
	switch kind {
	case "working_paper":
		var ownID uuid.UUID
		err = tx.QueryRow(ctx, `SELECT id FROM working_papers WHERE id=$1 AND org_id=$2 AND status='completed' FOR UPDATE`, id, org).Scan(&ownID)
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, UPRWorkflowError("Pilih KK Pemantauan dan Reviu yang sudah Selesai.")
		}
		if err != nil {
			return uuid.Nil, err
		}
		wp, err := (&workingPaperRepository{pool: tx}).GetByID(ctx, id)
		if err != nil {
			return uuid.Nil, err
		}
		id, err = saveUPRReportVersion(ctx, tx, org, actor, kind, wp.AssessmentCycle, &ownID, nil, wp, replacement)
		if err != nil {
			return uuid.Nil, err
		}
	case "evaluation":
		var ownID uuid.UUID
		err = tx.QueryRow(ctx, `SELECT id FROM evaluations WHERE id=$1 AND organization_id=$2 AND status='final' FOR UPDATE`, id, org).Scan(&ownID)
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, UPRWorkflowError("Pilih Evaluasi yang sudah Final.")
		}
		if err != nil {
			return uuid.Nil, err
		}
		evaluation, err := (&evaluationRepository{pool: tx}).GetByID(ctx, id)
		if err != nil {
			return uuid.Nil, err
		}
		id, err = saveUPRReportVersion(ctx, tx, org, actor, kind, evaluation.Period, &ownID, nil, evaluation, replacement)
		if err != nil {
			return uuid.Nil, err
		}
	case "":
		if replacement != nil {
			return uuid.Nil, UPRWorkflowError("Laporan Semester mengikuti riwayat versi laporan.")
		}
		var ownID uuid.UUID
		err = tx.QueryRow(ctx, `SELECT id FROM upr_report_versions WHERE id=$1 AND organization_id=$2 AND kind='semester'`, id, org).Scan(&ownID)
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrUPRNotFound
		}
		if err != nil {
			return uuid.Nil, err
		}
	default:
		return uuid.Nil, UPRWorkflowError("Jenis dokumen tidak valid.")
	}
	if err := deliverUPRReport(ctx, tx, id, recipient, actor); err != nil {
		return uuid.Nil, err
	}
	return id, tx.Commit(ctx)
}

func reportRecipient(ctx context.Context, tx pgx.Tx, org uuid.UUID) (uuid.UUID, error) {
	var recipient uuid.UUID
	err := tx.QueryRow(ctx, `SELECT parent.id FROM organizations child JOIN organizations parent ON parent.id=child.parent_id
		WHERE child.id=$1 AND child.upr_level='upr_t2' AND parent.upr_level='upr_t1' FOR KEY SHARE OF parent`, org).Scan(&recipient)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrUPRNoRecipient
	}
	return recipient, err
}

func deliverUPRReport(ctx context.Context, tx pgx.Tx, id, recipient, actor uuid.UUID) error {
	// Find the most recent actually sent predecessor, even if a version was skipped.
	_, err := tx.Exec(ctx, `WITH RECURSIVE predecessors AS (
		SELECT v.id,v.previous_version_id,1 AS distance FROM upr_report_versions selected
		JOIN upr_report_versions v ON v.id=selected.previous_version_id WHERE selected.id=$1
		UNION ALL SELECT v.id,v.previous_version_id,p.distance+1 FROM predecessors p JOIN upr_report_versions v ON v.id=p.previous_version_id
	)
	INSERT INTO upr_report_deliveries(report_version_id,recipient_organization_id,previous_delivery_id,sent_by,sent_at)
	VALUES($1,$2,(SELECT d.id FROM predecessors p JOIN upr_report_deliveries d ON d.report_version_id=p.id
	WHERE d.recipient_organization_id=$2 ORDER BY p.distance LIMIT 1),$3,$4)
	ON CONFLICT(report_version_id) DO NOTHING`, id, recipient, actor, timeutil.BusinessNow().UTC())
	return err
}

func (s *UPRWorkflow) ResolveUPRReport(ctx context.Context, org, actor, id uuid.UUID, resolution, note string) error {
	note = strings.TrimSpace(note)
	switch resolution {
	case "accepted":
		note = ""
	case "changes_requested":
		if note == "" || len([]rune(note)) > 2000 {
			return UPRWorkflowError("Isi catatan perbaikan, maksimal 2.000 karakter.")
		}
	default:
		return UPRWorkflowError("Tindakan laporan tidak valid.")
	}
	result, err := s.pool.Exec(ctx, `UPDATE upr_report_deliveries SET resolution=$3,note=$4,resolved_by=$5,resolved_at=$6
		WHERE id=$1 AND recipient_organization_id=$2 AND resolution IS NULL`, id, org, resolution, note, actor, timeutil.BusinessNow().UTC())
	if err != nil {
		return err
	}
	if result.RowsAffected() == 1 {
		return nil
	}
	var previous *string
	var previousNote string
	err = s.pool.QueryRow(ctx, `SELECT resolution,note FROM upr_report_deliveries WHERE id=$1 AND recipient_organization_id=$2`, id, org).Scan(&previous, &previousNote)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrUPRNotFound
	}
	if err != nil {
		return err
	}
	if previous != nil && *previous == resolution && previousNote == note {
		return nil
	}
	return ErrUPRConflict
}
