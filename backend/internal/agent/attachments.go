package agent

import (
	"context"
	"path/filepath"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Service) AddAttachment(ctx context.Context, actor, cid uuid.UUID, in AttachmentInput) (Attachment, error) {
	var out Attachment
	if in.Size <= 0 || in.Size > 1024*1024 || len(in.Text) == 0 || len(in.Text) > 150000 || len(in.IdempotencyKey) > 120 || len(in.Warnings) > 8 {
		return out, ErrInvalid
	}
	if in.MimeType != "application/pdf" && in.MimeType != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" {
		return out, ErrInvalid
	}
	name := filepath.Base(strings.TrimSpace(in.Name))
	name = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, name)
	if name == "" || len(name) > 240 {
		return out, ErrInvalid
	}
	warnings := []string{}
	for _, warning := range in.Warnings {
		warning = strings.TrimSpace(strings.Map(func(r rune) rune {
			if unicode.IsControl(r) {
				return -1
			}
			return r
		}, warning))
		if len(warning) > 500 {
			return out, ErrInvalid
		}
		if warning != "" {
			warnings = append(warnings, warning)
		}
	}
	in.Warnings = uniqueStrings(warnings)
	hash := digest(in)
	err := s.store.Mutate(ctx, actor, cid, func(r *Record, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, actor, tx); err != nil {
			return err
		}
		if in.IdempotencyKey != "" {
			if x, ok := r.Requests["attachment:"+in.IdempotencyKey]; ok {
				if x.Hash != hash {
					return ErrConflict
				}
				for _, a := range r.Attachments {
					if a.Attachment.ID == x.AttachmentID {
						out = a.Attachment
						return nil
					}
				}
				return ErrConflict
			}
		}
		if len(r.Attachments) >= 20 {
			return ErrInvalid
		}
		out = Attachment{ID: uuid.New(), Name: name, MIMEType: in.MimeType, Size: in.Size, CreatedAt: time.Now().UTC(), Warnings: in.Warnings}
		r.Attachments = append(r.Attachments, StoredAttachment{Attachment: out, Text: in.Text, OrganizationIDs: append([]uuid.UUID(nil), r.OrganizationIDs...)})
		r.Conversation.UpdatedAt = out.CreatedAt
		if in.IdempotencyKey != "" {
			if r.Requests == nil {
				r.Requests = map[string]RequestReceipt{}
			}
			r.Requests["attachment:"+in.IdempotencyKey] = RequestReceipt{Hash: hash, AttachmentID: out.ID}
		}
		return nil
	})
	return out, publicError(err)
}
func (s *Service) GetAttachment(ctx context.Context, actor, cid, attachmentID uuid.UUID) (AttachmentInput, error) {
	r, err := s.store.Read(ctx, actor, cid)
	if err != nil {
		return AttachmentInput{}, publicError(err)
	}
	if err = s.authorize(ctx, r, actor); err != nil {
		return AttachmentInput{}, err
	}
	for _, a := range r.Attachments {
		if a.Attachment.ID == attachmentID {
			return AttachmentInput{Name: a.Attachment.Name, MimeType: a.Attachment.MIMEType, Size: a.Attachment.Size, Text: a.Text, Warnings: a.Attachment.Warnings}, nil
		}
	}
	return AttachmentInput{}, ErrNotFound
}
