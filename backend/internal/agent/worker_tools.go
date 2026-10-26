package agent

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Service) definitions(skills []string) []ToolDefinition {
	defs := []ToolDefinition{loadSkillDefinition(), askUserDefinition()}
	defs = append(defs, s.toolkit.Definitions(skills)...)
	return defs
}
func (s *Service) executeTool(ctx context.Context, claim *Claim, cp Checkpoint, call ToolCall) error {
	result := ToolResult{}
	loaded := ""
	allowed := false
	label := "Membaca data aplikasi"
	for _, d := range s.definitions(cp.Skills) {
		if d.Name == call.Name {
			allowed = true
			label = d.Description
			break
		}
	}
	if !allowed {
		result.Content = "Tool tidak tersedia. Muat skill yang sesuai atau gunakan operasi yang terdaftar."
	} else if call.Name == "ask_user" {
		var input struct {
			Question string   `json:"question"`
			Choices  []string `json:"choices"`
		}
		if json.Unmarshal(call.Arguments, &input) != nil || strings.TrimSpace(input.Question) == "" || len(input.Question) > 500 || len(input.Choices) > 8 {
			result.Content = "Pertanyaan tidak valid; gunakan pertanyaan singkat."
		} else {
			rows := []map[string]any{}
			for _, choice := range input.Choices {
				if strings.TrimSpace(choice) == "" || len(choice) > 120 {
					return ErrInvalid
				}
				rows = append(rows, map[string]any{"label": choice, "value": choice})
			}
			result.Content = "Menunggu jawaban pengguna untuk: " + input.Question
			result.Widgets = []Widget{{ID: uuid.NewString(), Type: "clarification", Title: input.Question, Description: "Pilih jawaban atau tulis informasi pada kolom pesan.", SnapshotAt: time.Now().UTC(), Rows: rows}}
			label = "Menunggu informasi pengguna"
		}
	} else if call.Name == "load_skill" {
		var input struct {
			Skill string `json:"skill"`
		}
		if json.Unmarshal(call.Arguments, &input) != nil || !knownSkill(input.Skill) {
			result.Content = "Skill tidak dikenal."
		} else {
			loaded = input.Skill
			result.Content = skillInstructions[loaded]
			label = "Memuat skill " + loaded
		}
	} else {
		toolCtx, cancel := context.WithTimeout(ctx, 45*time.Second)
		var err error
		result, err = s.toolkit.Execute(toolCtx, claim.OwnerID, call.Name, call.Arguments)
		cancel()
		if err != nil {
			result = ToolResult{Content: "Operasi belum dapat diselesaikan. Periksa cakupan, parameter, status data, dan informasi wajib."}
		} else {
			if err = s.toolkit.Authorize(ctx, claim.OwnerID, result.OrganizationIDs); err != nil {
				return ErrForbidden
			}
			if len(result.Content) > 40000 {
				result.Content = truncate(result.Content, 40000) + "\nHasil dibatasi; jangan menganggapnya sebagai populasi lengkap."
			}
			if len(result.Widgets) > 20 || len(result.Operations) > 30 {
				return ErrInvalid
			}
			if err = validateWidgets(result.Widgets); err != nil {
				return err
			}
			if len(result.Operations) > 0 {
				valid, err := s.toolkit.ValidateOperations(ctx, claim.OwnerID, result.Operations)
				if err != nil {
					result.Operations = nil
					result.Content += "\nUsulan belum valid; lengkapi informasi wajib tanpa mengarang."
				} else {
					if err = validateOperations(valid); err != nil {
						return err
					}
					result.Operations = valid
					result.OrganizationIDs = unionScope(result.OrganizationIDs, operationScope(valid))
				}
			}
		}
	}
	payload, err := json.Marshal(struct {
		Content    string      `json:"content"`
		Widgets    []Widget    `json:"widgets,omitempty"`
		Operations []Operation `json:"operations,omitempty"`
	}{result.Content, result.Widgets, result.Operations})
	if err != nil || len(payload) > 250000 {
		return ErrInvalid
	}
	return s.store.MutateClaim(ctx, claim, func(r *Record, run *StoredRun, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, claim.OwnerID, tx); err != nil {
			return err
		}
		if run.CancelRequested {
			return context.Canceled
		}
		run.Checkpoint.Turns = append(run.Checkpoint.Turns, Turn{Role: "tool", ToolCallID: call.ID, Content: string(payload)})
		run.Checkpoint.ToolCount++
		encoded, _ := json.Marshal(run.Checkpoint.Turns)
		if len(encoded) > 750000 {
			return ErrInvalid
		}
		run.Checkpoint.Widgets = append(run.Checkpoint.Widgets, result.Widgets...)
		run.Checkpoint.Operations = append(run.Checkpoint.Operations, result.Operations...)
		if len(run.Checkpoint.Operations) > 30 || len(run.Checkpoint.Widgets) > 40 {
			return ErrInvalid
		}
		if loaded != "" {
			run.Checkpoint.Skills = uniqueStrings(append(run.Checkpoint.Skills, loaded))
		}
		run.OrganizationIDs = unionScope(run.OrganizationIDs, result.OrganizationIDs)
		r.OrganizationIDs = unionScope(r.OrganizationIDs, result.OrganizationIDs)
		addEvent(run, truncate(label, 100), "completed")
		return nil
	})
}
func (s *Service) finalize(ctx context.Context, claim *Claim, content string) error {
	return s.store.MutateClaim(ctx, claim, func(r *Record, run *StoredRun, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, claim.OwnerID, tx); err != nil {
			return err
		}
		if run.CancelRequested {
			return context.Canceled
		}
		if len(strings.TrimSpace(content)) == 0 {
			content = "Peninjauan selesai. Lihat hasil dan sumber yang tersedia."
		}
		now := time.Now().UTC()
		rid := run.Run.ID
		widgets := append([]Widget{}, run.Checkpoint.Widgets...)
		for i := range widgets {
			if widgets[i].SnapshotAt.IsZero() {
				widgets[i].SnapshotAt = now
			}
			if widgets[i].ID == "" {
				widgets[i].ID = uuid.NewString()
			}
		}
		r.Messages = append(r.Messages, StoredMessage{Message: Message{ID: uuid.New(), ConversationID: r.Conversation.ID, RunID: &rid, Role: "assistant", Content: content, Widgets: widgets, Attachments: []Attachment{}, CreatedAt: now}, OrganizationIDs: append([]uuid.UUID(nil), run.OrganizationIDs...)})
		run.Run.Status = "completed"
		run.Run.FinishedAt = &now
		needsInput := false
		for _, w := range widgets {
			if w.Type == "clarification" {
				needsInput = true
				break
			}
		}
		if len(run.Checkpoint.Operations) > 0 && !needsInput {
			ops := run.Checkpoint.Operations
			if err := validateOperations(ops); err != nil {
				return err
			}
			p := Proposal{ID: uuid.New(), ConversationID: r.Conversation.ID, RunID: rid, Revision: 1, Status: "proposed", Title: "Usulan tindak lanjut", Operations: ops, CreatedAt: now}
			r.Proposals = append(r.Proposals, StoredProposal{Proposal: p, OrganizationIDs: append([]uuid.UUID(nil), run.OrganizationIDs...), ContentHash: digest(ops)})
			run.Run.Status = "waiting_for_confirmation"
			run.Run.FinishedAt = nil
			addEvent(run, "Usulan siap ditinjau; belum ada perubahan bisnis", "completed")
		} else {
			for _, w := range widgets {
				if w.Type == "clarification" {
					run.Run.Status = "waiting_for_input"
					break
				}
			}
			addEvent(run, "Peninjauan selesai", "completed")
		}
		r.Conversation.Status = run.Run.Status
		r.Conversation.UpdatedAt = now
		return nil
	})
}
func validateWidgets(widgets []Widget) error {
	for _, w := range widgets {
		switch w.Type {
		case "table", "metrics", "bar_chart", "document", "clarification", "risk_detail", "priority_list", "period_comparison":
		default:
			return ErrInvalid
		}
		if err := validateResponseWidget(w); err != nil {
			return err
		}
		if len(w.Rows) > 200 || len(w.Columns) > 20 || len(w.Metrics) > 30 || len(w.Title) > 300 {
			return ErrInvalid
		}
		for _, row := range w.Rows {
			for key, value := range row {
				switch v := value.(type) {
				case nil, bool, float64, float32, int, int32, int64, json.Number:
				case string:
					if len(v) > 8000 {
						return ErrInvalid
					}
					if key == "href" && v != "" && !safeHref(v) {
						return ErrInvalid
					}
				default:
					return ErrInvalid
				}
			}
		}
		for _, m := range w.Metrics {
			switch m.Value.(type) {
			case string, float64, float32, int, int32, int64, json.Number:
			default:
				return ErrInvalid
			}
		}
	}
	return nil
}
