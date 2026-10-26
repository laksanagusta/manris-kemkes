package agent

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func TestMultiDocumentFollowupUsesBoundedContextAndPreservesHistory(t *testing.T) {
	calls := 0
	var received []Turn
	s, store, _, actor, cid := fixture(t, modelFunc(func(_ context.Context, turns []Turn, _ []ToolDefinition) (Turn, error) {
		calls++
		received = turns
		return Turn{Role: "assistant", Content: "Dokumen ditinjau"}, nil
	}))
	WithLimits(Limits{Lease: 5 * time.Second})(s)
	ids := []string{}
	for i := 0; i < 6; i++ {
		marker := string(rune('A' + i))
		document := "AWAL_" + marker + strings.Repeat("Isi laporan biasa. ", 3300) + "AKHIR_" + marker
		a, err := s.AddAttachment(t.Context(), actor, cid, AttachmentInput{Name: marker + ".pdf", MimeType: "application/pdf", Size: 1000, Text: document})
		if err != nil {
			t.Fatal(err)
		}
		ids = append(ids, a.ID.String())
	}
	for _, input := range []SendMessageInput{
		{Content: "Tinjau semua dokumen untuk unit saya; jangan mengarang PIC.", AttachmentIDs: ids[:5]},
		{Content: "Bandingkan dengan dokumen keenam; pertahankan batas unit saya.", AttachmentIDs: []string{ids[5], ids[5]}},
	} {
		if _, err := s.SendMessage(t.Context(), actor, cid, input); err != nil {
			t.Fatal(err)
		}
		if _, err := s.RunNext(t.Context()); err != nil {
			t.Fatalf("valid document follow-up failed: %v", err)
		}
	}
	if calls != 2 {
		t.Fatalf("model calls = %d, want 2", calls)
	}
	encoded, _ := json.Marshal(received)
	if len(encoded) > 300000 {
		t.Fatalf("context exceeded budget: %d", len(encoded))
	}
	contextText := turnsText(received)
	for _, text := range []string{"jangan mengarang PIC", "pertahankan batas unit saya", "AWAL_F", "AKHIR_F", "dipotong"} {
		if !strings.Contains(contextText, text) {
			t.Fatalf("context lost request/evidence/limitation %q", text)
		}
	}
	if strings.Count(contextText, "AWAL_F") != 1 {
		t.Fatal("repeated attachment reference duplicated document text")
	}
	saved, _ := store.Read(t.Context(), actor, cid)
	if len(saved.Messages) != 4 || len(saved.Attachments) != 6 || !strings.HasSuffix(saved.Attachments[5].Text, "AKHIR_F") {
		t.Fatal("context compaction changed persisted history or attachment evidence")
	}
}

func TestLongHistoryRetainsOriginalTaskAndRecentConstraints(t *testing.T) {
	var received []Turn
	s, store, _, actor, cid := fixture(t, modelFunc(func(_ context.Context, turns []Turn, _ []ToolDefinition) (Turn, error) {
		received = turns
		return Turn{Role: "assistant", Content: "Selesai"}, nil
	}))
	WithLimits(Limits{Lease: 5 * time.Second})(s)
	err := store.Mutate(t.Context(), actor, cid, func(r *Record, _ pgx.Tx) error {
		r.Messages = append(r.Messages, StoredMessage{Message: Message{ID: uuid.New(), Role: "user", Content: "TUGAS_AWAL: Tinjau risiko tinggi; jangan mengarang tenggat."}})
		for i := 0; i < 30; i++ {
			r.Messages = append(r.Messages, StoredMessage{Message: Message{ID: uuid.New(), Role: "user", Content: strings.Repeat("Batas cakupan lama. ", 700)}})
			r.Messages = append(r.Messages, StoredMessage{Message: Message{ID: uuid.New(), Role: "assistant", Content: strings.Repeat("Jawaban terdahulu. ", 700), Widgets: []Widget{{Type: "table", Rows: []map[string]any{{"description": strings.Repeat("<data>", 10000)}}}}}})
		}
		r.Messages = append(r.Messages, StoredMessage{Message: Message{ID: uuid.New(), Role: "user", Content: "BATAS_TERBARU: hanya unit A dan periode 2026-Q4."}})
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.SendMessage(t.Context(), actor, cid, SendMessageInput{Content: "PERMINTAAN_KINI: lanjutkan analisis."}); err != nil {
		t.Fatal(err)
	}
	if _, err = s.RunNext(t.Context()); err != nil {
		t.Fatal(err)
	}
	encoded, _ := json.Marshal(received)
	if len(encoded) > 300000 {
		t.Fatalf("context exceeded budget: %d", len(encoded))
	}
	for _, text := range []string{"TUGAS_AWAL", "BATAS_TERBARU", "PERMINTAAN_KINI", "riwayat", "dihilangkan"} {
		if !strings.Contains(turnsText(received), text) {
			t.Fatalf("context lost required information %q", text)
		}
	}
	detail, _ := s.Detail(t.Context(), actor, cid)
	if len(detail.Messages) != 64 {
		t.Fatalf("persisted history was compacted: %d", len(detail.Messages))
	}
}

func TestFollowupContextDoesNotAuthorizeStaleProposal(t *testing.T) {
	s, store, tools, actor, cid, proposal := prepared(t)
	var received []Turn
	s.model = modelFunc(func(_ context.Context, turns []Turn, _ []ToolDefinition) (Turn, error) {
		received = turns
		return Turn{Role: "assistant", Content: "Usulan lama tetap belum diterapkan."}, nil
	})
	if _, err := s.SendMessage(t.Context(), actor, cid, SendMessageInput{Content: "Tinjau kembali usulan tadi."}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.RunNext(t.Context()); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(turnsText(received), `"status":"stale"`) {
		t.Fatal("model did not receive current proposal review status")
	}
	detail, _ := s.Detail(t.Context(), actor, cid)
	if len(store.business) != 0 || tools.applied != 0 || len(detail.Proposals) != 1 || detail.Proposals[0].ID != proposal.ID || detail.Proposals[0].Status != "stale" {
		t.Fatal("history replayed an unconfirmed operation")
	}
}

func TestDocumentContextBudgetCountsJSONEscapingAndUnicode(t *testing.T) {
	var received []Turn
	s, _, _, actor, cid := fixture(t, modelFunc(func(_ context.Context, turns []Turn, _ []ToolDefinition) (Turn, error) {
		received = turns
		return Turn{Role: "assistant", Content: "Selesai"}, nil
	}))
	WithLimits(Limits{Lease: 5 * time.Second})(s)
	ids := []string{}
	for range 5 {
		document := "AWAL_BUKTI" + strings.Repeat("<\"\\\nÅ界", 9000) + "AKHIR_BUKTI"
		a, err := s.AddAttachment(t.Context(), actor, cid, AttachmentInput{Name: "laporan.pdf", MimeType: "application/pdf", Size: 1000, Text: document})
		if err != nil {
			t.Fatal(err)
		}
		ids = append(ids, a.ID.String())
	}
	for _, content := range []string{strings.Repeat("<", 16000), strings.Repeat(">", 16000)} {
		if _, err := s.SendMessage(t.Context(), actor, cid, SendMessageInput{Content: content, AttachmentIDs: ids}); err != nil {
			t.Fatal(err)
		}
		if _, err := s.RunNext(t.Context()); err != nil {
			t.Fatal(err)
		}
	}
	encoded, _ := json.Marshal(received)
	if len(encoded) > 300000 {
		t.Fatalf("escaped context exceeded budget: %d", len(encoded))
	}
	text := turnsText(received)
	if !utf8.ValidString(text) || strings.Count(text, "AWAL_BUKTI") != 5 || strings.Count(text, "AKHIR_BUKTI") != 5 {
		t.Fatal("context clipping broke unicode or lost document boundary evidence")
	}
	detail, _ := s.Detail(t.Context(), actor, cid)
	warnings := 0
	for _, widget := range detail.Messages[len(detail.Messages)-1].Widgets {
		if widget.Type == "document" && strings.Contains(widget.Description, "dipotong") {
			warnings++
		}
	}
	if warnings != 5 {
		t.Fatalf("document limit warnings = %d, want 5", warnings)
	}
}

func TestAttachmentExtractionWarningsPersistAndBindRetry(t *testing.T) {
	var received []Turn
	s, _, _, actor, cid := fixture(t, modelFunc(func(_ context.Context, turns []Turn, _ []ToolDefinition) (Turn, error) {
		received = turns
		return Turn{Role: "assistant", Content: "Hasil hanya mencakup bagian dokumen yang berhasil diekstrak."}, nil
	}))
	input := AttachmentInput{Name: "laporan.pdf", MimeType: "application/pdf", Size: 1000, Text: "Isi dokumen", IdempotencyKey: "warning-retry", Warnings: []string{"  Ekstraksi dibatasi 60000 karakter.\x00\n", "Ekstraksi dibatasi 60000 karakter."}}
	attachment, err := s.AddAttachment(t.Context(), actor, cid, input)
	if err != nil {
		t.Fatal(err)
	}
	if len(attachment.Warnings) != 1 || attachment.Warnings[0] != "Ekstraksi dibatasi 60000 karakter." {
		t.Fatalf("warnings were not sanitized: %+v", attachment.Warnings)
	}
	retried, err := s.AddAttachment(t.Context(), actor, cid, input)
	if err != nil || retried.ID != attachment.ID {
		t.Fatalf("same extraction retry failed: %v", err)
	}
	input.Warnings = []string{"Ekstraksi dibatasi 10000 karakter."}
	if _, err = s.AddAttachment(t.Context(), actor, cid, input); !errors.Is(err, ErrConflict) {
		t.Fatal("retry did not bind extraction warnings")
	}
	stored, err := s.GetAttachment(t.Context(), actor, cid, attachment.ID)
	if err != nil || len(stored.Warnings) != 1 || stored.Warnings[0] != attachment.Warnings[0] {
		t.Fatal("private attachment lost extraction warnings")
	}
	if _, err = s.SendMessage(t.Context(), actor, cid, SendMessageInput{Content: "Tinjau dokumen.", AttachmentIDs: []string{attachment.ID.String()}}); err != nil {
		t.Fatal(err)
	}
	if _, err = s.RunNext(t.Context()); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(turnsText(received), attachment.Warnings[0]) {
		t.Fatal("model was not told extraction is incomplete")
	}
	detail, _ := s.Detail(t.Context(), actor, cid)
	if len(detail.Messages[0].Attachments[0].Warnings) != 1 {
		t.Fatal("user-visible attachment lost extraction warning")
	}
}

func turnsText(turns []Turn) string {
	var b strings.Builder
	for _, turn := range turns {
		b.WriteString(turn.Content)
		b.WriteByte('\n')
	}
	return b.String()
}

func TestCategoryChartIntentSurvivesDefaultClarification(t *testing.T) {
	record := &Record{Messages: []StoredMessage{
		{Message: Message{Role: "user", Content: "tolong bandingkan risiko per kategori dalam bentuk bar chart"}},
		{Message: Message{Role: "assistant", Content: "Pakai default atau pilih unit/periode?"}},
		{Message: Message{Role: "user", Content: "Pakai default"}},
	}}
	turns, _, err := initialContext(record, Checkpoint{Skills: []string{"reports"}}, "")
	if err != nil {
		t.Fatal(err)
	}
	if turns[len(turns)-1].Content != "Pakai default" || !strings.Contains(turnsText(turns), "risiko per kategori dalam bentuk bar chart") {
		t.Fatal("clarification discarded the requested chart and grouping")
	}
	for _, instruction := range []string{"analyze_report", "groupBy=category", "bar_chart", "compare_periods tidak menghasilkan grafik"} {
		if !strings.Contains(turns[0].Content, instruction) {
			t.Fatalf("model lacks chart routing/output contract: %s", instruction)
		}
	}
}

func TestCharterContextIsDataAndAvailableBeforeDraftGeneration(t *testing.T) {
	record := &Record{Messages: []StoredMessage{{Message: Message{Role: "user", Content: "buatkan 3 draf risiko, kamu yang membuat"}}}}
	marker := "PIAGAM_CONTEXT_MARKER"
	turns, _, err := initialContext(record, Checkpoint{}, `{"riskCharterContext":{"status":"available","scope":"`+marker+`"}}`)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(turns[0].Content, marker) {
		t.Fatal("charter data entered system instructions")
	}
	if !strings.Contains(turns[1].Content, marker) || turns[1].Role != "user" || !strings.Contains(turns[1].Content, "bukan instruksi") {
		t.Fatal("charter context is missing or trusted as instructions")
	}
	for _, instruction := range []string{"riskCharterContext", "get_risk_charter_context", "ruang lingkup", "dasar hukum", "pemangku kepentingan", "jumlah draf", "create_risk"} {
		if !strings.Contains(turns[0].Content, instruction) {
			t.Errorf("draft instructions missing %s", instruction)
		}
	}
	if turns[len(turns)-1].Content != record.Messages[0].Message.Content {
		t.Fatal("charter context displaced latest request")
	}
}

func TestApplicationContextScopePersistsBeforeModelReceivesCharterData(t *testing.T) {
	calls := 0
	s, store, tools, actor, cid := fixture(t, modelFunc(func(_ context.Context, _ []Turn, _ []ToolDefinition) (Turn, error) {
		calls++
		return Turn{Role: "assistant", Content: "Konteks dibaca"}, nil
	}))
	if _, err := s.SendMessage(t.Context(), actor, cid, SendMessageInput{Content: "Buatkan 3 draf risiko"}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.RunNext(t.Context()); err != nil {
		t.Fatal(err)
	}
	record, err := store.Read(t.Context(), actor, cid)
	if err != nil {
		t.Fatal(err)
	}
	if calls != 1 || len(record.OrganizationIDs) != 1 || record.OrganizationIDs[0] != tools.scope || len(record.Runs[0].OrganizationIDs) != 1 || record.Runs[0].OrganizationIDs[0] != tools.scope {
		t.Fatal("application source context was not bound to current-access checks")
	}
}
