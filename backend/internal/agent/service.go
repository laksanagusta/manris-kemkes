package agent

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Service struct {
	store   Store
	toolkit Toolkit
	model   Model
	limits  Limits
}
type Limits struct {
	MaxSteps       int
	MaxTools       int
	MaxRunDuration time.Duration
	Lease          time.Duration
	PollInterval   time.Duration
}
type Option func(*Service)

func WithLimits(l Limits) Option {
	return func(s *Service) {
		if l.MaxSteps > 0 {
			s.limits.MaxSteps = l.MaxSteps
		}
		if l.MaxTools > 0 {
			s.limits.MaxTools = l.MaxTools
		}
		if l.MaxRunDuration > 0 {
			s.limits.MaxRunDuration = l.MaxRunDuration
		}
		if l.Lease > 0 {
			s.limits.Lease = l.Lease
		}
		if l.PollInterval > 0 {
			s.limits.PollInterval = l.PollInterval
		}
	}
}
func NewService(store Store, toolkit Toolkit, model Model, options ...Option) *Service {
	s := &Service{store: store, toolkit: toolkit, model: model, limits: Limits{MaxSteps: 12, MaxTools: 32, MaxRunDuration: 5 * time.Minute, Lease: 30 * time.Second, PollInterval: time.Second}}
	for _, o := range options {
		o(s)
	}
	return s
}
func (s *Service) Skills() []Skill { return Skills() }
func (s *Service) IsReady() error {
	if s == nil || s.model == nil || s.toolkit == nil || s.store == nil {
		return ErrUnavailable
	}
	if r, ok := s.model.(interface{ Ready() error }); ok {
		return publicError(r.Ready())
	}
	return nil
}
func (s *Service) ListConversations(ctx context.Context, actor uuid.UUID) ([]Conversation, error) {
	if actor == uuid.Nil {
		return nil, ErrForbidden
	}
	records, err := s.store.List(ctx, actor)
	if err != nil {
		return nil, publicError(err)
	}
	out := []Conversation{}
	for i := range records {
		r := &records[i]
		if s.authorize(ctx, r, actor) == nil {
			out = append(out, r.Conversation)
		}
	}
	return out, nil
}
func (s *Service) CreateConversation(ctx context.Context, actor uuid.UUID, title string) (Conversation, error) {
	if actor == uuid.Nil {
		return Conversation{}, ErrForbidden
	}
	if err := s.toolkit.Authorize(ctx, actor, nil); err != nil {
		return Conversation{}, ErrForbidden
	}
	title = strings.TrimSpace(title)
	if len(title) > 200 {
		return Conversation{}, ErrInvalid
	}
	if title == "" {
		title = "Percakapan baru"
	}
	now := time.Now().UTC()
	r := &Record{OwnerID: actor, Conversation: Conversation{ID: uuid.New(), Title: title, Status: "completed", CreatedAt: now, UpdatedAt: now}, Messages: []StoredMessage{}, Attachments: []StoredAttachment{}, Runs: []StoredRun{}, Proposals: []StoredProposal{}, OrganizationIDs: []uuid.UUID{}}
	err := s.store.Create(ctx, r)
	return r.Conversation, publicError(err)
}
func (s *Service) Detail(ctx context.Context, actor, cid uuid.UUID) (ConversationDetail, error) {
	r, err := s.store.Read(ctx, actor, cid)
	if err != nil {
		return ConversationDetail{}, publicError(err)
	}
	if err = s.authorize(ctx, r, actor); err != nil {
		return ConversationDetail{}, err
	}
	d := ConversationDetail{Conversation: r.Conversation, Messages: []Message{}, Runs: []Run{}, Proposals: []Proposal{}}
	for _, m := range r.Messages {
		v := m.Message
		if v.Widgets == nil {
			v.Widgets = []Widget{}
		}
		if v.Attachments == nil {
			v.Attachments = []Attachment{}
		}
		d.Messages = append(d.Messages, v)
	}
	for _, v := range r.Runs {
		run := v.Run
		if run.Events == nil {
			run.Events = []Activity{}
		}
		d.Runs = append(d.Runs, run)
	}
	for _, v := range r.Proposals {
		p := v.Proposal
		if p.Operations == nil {
			p.Operations = []Operation{}
		}
		d.Proposals = append(d.Proposals, p)
	}
	return d, nil
}
func (s *Service) SendMessage(ctx context.Context, actor, cid uuid.UUID, in SendMessageInput) (Run, error) {
	in.Content = strings.TrimSpace(in.Content)
	if len(in.Content) == 0 || len(in.Content) > 16000 || len(in.Skills) > 4 || len(in.AttachmentIDs) > 5 || len(in.IdempotencyKey) > 120 {
		return Run{}, ErrInvalid
	}
	for _, id := range in.Skills {
		if !knownSkill(id) {
			return Run{}, ErrInvalid
		}
	}
	hash := digest(struct {
		Content             string
		Skills, Attachments []string
	}{in.Content, in.Skills, in.AttachmentIDs})
	// Resolve uncertain network retries even when model availability has changed.
	if in.IdempotencyKey != "" {
		previous, err := s.store.Read(ctx, actor, cid)
		if err != nil {
			return Run{}, publicError(err)
		}
		if err = s.authorize(ctx, previous, actor); err != nil {
			return Run{}, err
		}
		if receipt, ok := previous.Requests["message:"+in.IdempotencyKey]; ok {
			if receipt.Hash != hash {
				return Run{}, ErrConflict
			}
			for _, stored := range previous.Runs {
				if stored.Run.ID == receipt.RunID {
					return stored.Run, nil
				}
			}
			return Run{}, ErrConflict
		}
	}
	if err := s.IsReady(); err != nil {
		return Run{}, err
	}
	if ready, ok := s.model.(interface{ ReadyContext(context.Context) error }); ok {
		if err := ready.ReadyContext(ctx); err != nil {
			return Run{}, publicError(err)
		}
	}
	var result Run
	err := s.store.Mutate(ctx, actor, cid, func(r *Record, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, actor, tx); err != nil {
			return err
		}
		if in.IdempotencyKey != "" {
			if x, ok := r.Requests["message:"+in.IdempotencyKey]; ok {
				if x.Hash != hash {
					return ErrConflict
				}
				for _, run := range r.Runs {
					if run.Run.ID == x.RunID {
						result = run.Run
						return nil
					}
				}
				return ErrConflict
			}
		}
		for _, run := range r.Runs {
			if run.Run.Status == "queued" || run.Run.Status == "running" {
				return ErrConflict
			}
		}
		attachments := []Attachment{}
		for _, id := range in.AttachmentIDs {
			found := false
			for _, a := range r.Attachments {
				if a.Attachment.ID.String() == id {
					attachments = append(attachments, a.Attachment)
					found = true
					break
				}
			}
			if !found {
				return ErrNotFound
			}
		}
		if len(r.Messages) >= 100 || len(r.Runs) >= 50 {
			return ErrInvalid
		}
		now := time.Now().UTC()
		for i := range r.Proposals {
			if r.Proposals[i].Proposal.Status == "proposed" {
				r.Proposals[i].Proposal.Status = "stale"
			}
		}
		for i := range r.Runs {
			if r.Runs[i].Run.Status == "waiting_for_confirmation" || r.Runs[i].Run.Status == "waiting_for_input" {
				r.Runs[i].Run.Status = "completed"
				r.Runs[i].Run.FinishedAt = &now
			}
		}
		result = Run{ID: uuid.New(), ConversationID: cid, Status: "queued", Events: []Activity{}}
		rid := result.ID
		r.Messages = append(r.Messages, StoredMessage{Message: Message{ID: uuid.New(), ConversationID: cid, RunID: &rid, Role: "user", Content: in.Content, Widgets: []Widget{}, Attachments: attachments, CreatedAt: now}, OrganizationIDs: append([]uuid.UUID(nil), r.OrganizationIDs...)})
		skills := uniqueStrings(in.Skills)
		if len(skills) == 0 {
			// Automatic mode continues the loaded domain tools across replies.
			// Skip empty legacy checkpoints; authorization is still checked per tool.
			for i := len(r.Runs) - 1; i >= 0; i-- {
				if len(r.Runs[i].Checkpoint.Skills) > 0 {
					skills = uniqueStrings(r.Runs[i].Checkpoint.Skills)
					break
				}
			}
		}
		r.Runs = append(r.Runs, StoredRun{Run: result, OrganizationIDs: append([]uuid.UUID(nil), r.OrganizationIDs...), Checkpoint: Checkpoint{Skills: skills, CreatedAt: now}})
		r.Conversation.Status = "queued"
		r.Conversation.UpdatedAt = now
		if r.Conversation.Title == "Percakapan baru" {
			r.Conversation.Title = truncate(in.Content, 80)
		}
		if in.IdempotencyKey != "" {
			if r.Requests == nil {
				r.Requests = map[string]RequestReceipt{}
			}
			r.Requests["message:"+in.IdempotencyKey] = RequestReceipt{Hash: hash, RunID: rid}
		}
		return nil
	})
	return result, publicError(err)
}
func (s *Service) Cancel(ctx context.Context, actor, cid, rid uuid.UUID) error {
	return publicError(s.store.Mutate(ctx, actor, cid, func(r *Record, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, actor, tx); err != nil {
			return err
		}
		for i := range r.Runs {
			run := &r.Runs[i]
			if run.Run.ID != rid {
				continue
			}
			if run.Run.Status == "completed" || run.Run.Status == "failed" || run.Run.Status == "cancelled" {
				return nil
			}
			now := time.Now().UTC()
			run.CancelRequested = true
			run.Run.Status = "cancelled"
			run.Run.FinishedAt = &now
			addEvent(run, "Pekerjaan dihentikan", "completed")
			r.Conversation.Status = "cancelled"
			r.Conversation.UpdatedAt = now
			for j := range r.Proposals {
				if r.Proposals[j].Proposal.RunID == rid && r.Proposals[j].Proposal.Status == "proposed" {
					r.Proposals[j].Proposal.Status = "rejected"
				}
			}
			return nil
		}
		return ErrNotFound
	}))
}
