package agent

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func TestMitigationReportingFollowupReceivesActionableInstructions(t *testing.T) {
	// Follow-ups can begin with no selected skill and a prior assistant refusal.
	// They still need the discovery and proposal workflow before the first call.
	for _, skills := range [][]string{nil, {"mitigations"}} {
		record := &Record{Messages: []StoredMessage{
			{Message: Message{Role: "user", Content: "Mitigasi R-241 selesai; sudah dilakukan pemeriksaan."}},
			{Message: Message{Role: "assistant", Content: "Saya belum bisa mengirim atau menyimpan laporan dari sini."}},
			{Message: Message{Role: "user", Content: "tolong dilaporkan"}},
		}}
		turns, _, err := initialContext(record, Checkpoint{Skills: skills}, "Unit pengujian")
		if err != nil {
			t.Fatal(err)
		}
		for _, instruction := range []string{
			"load_skill", "mitigations", "list_mitigation_tasks", "get_mitigation_task",
			"propose_operations", "report_mitigation_task", "ask_user",
			"Tombol Terapkan hanya muncul", "Jangan berhenti",
		} {
			if !strings.Contains(turns[0].Content, instruction) {
				t.Errorf("skills %v: initial instructions omit %q", skills, instruction)
			}
		}
		if turns[len(turns)-1].Content != "tolong dilaporkan" {
			t.Fatal("reporting instructions displaced the latest user request")
		}
	}
}

func TestAutomaticSkillsRetainLoadedToolsAcrossReportingReplies(t *testing.T) {
	for _, tt := range []struct {
		name     string
		selected []string
		want     string
	}{
		{name: "automatic", want: "mitigations"},
		{name: "explicit selection", selected: []string{"reports"}, want: "reports"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			s, store, _, actor, cid := fixture(t, modelFunc(nil))
			err := store.Mutate(t.Context(), actor, cid, func(r *Record, _ pgx.Tx) error {
				// This includes legacy follow-ups that discarded loaded skills.
				r.Runs = []StoredRun{
					{Run: Run{ID: uuid.New(), Status: "completed"}, Checkpoint: Checkpoint{Skills: []string{"mitigations"}}},
					{Run: Run{ID: uuid.New(), Status: "completed"}},
				}
				return nil
			})
			if err != nil {
				t.Fatal(err)
			}
			if _, err = s.SendMessage(t.Context(), actor, cid, SendMessageInput{Content: "done", Skills: tt.selected}); err != nil {
				t.Fatal(err)
			}
			record, err := store.Read(t.Context(), actor, cid)
			if err != nil {
				t.Fatal(err)
			}
			loaded := record.Runs[len(record.Runs)-1].Checkpoint.Skills
			if len(loaded) != 1 || loaded[0] != tt.want {
				t.Fatalf("reply lost or overrode skill selection: got %v, want %s", loaded, tt.want)
			}
			if len(store.business) != 0 {
				t.Fatal("retaining a skill must not apply a business operation")
			}
		})
	}
}

func TestLoadedMitigationSkillExplainsReportValidationAndConfirmation(t *testing.T) {
	for _, instruction := range []string{
		"report_mitigation_task", "targetId", "expectedUpdatedAt", "organizationId",
		"notes", "10", "1000", "evidenceUrl", "Penanganan",
		"ask_user", "Terapkan", "applied",
	} {
		if !strings.Contains(skillInstructions["mitigations"], instruction) {
			t.Errorf("loaded mitigation skill omits %q", instruction)
		}
	}
}
