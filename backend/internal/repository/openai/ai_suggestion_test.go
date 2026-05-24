package openai

import (
	"strings"
	"testing"
)

func TestBuildRiskSuggestionPromptEmphasizesPiagamAndTechnicalContext(t *testing.T) {
	repo := &aiRepository{}

	prompt := repo.buildRiskSuggestionPrompt(`["risiko a"]`)

	for _, fragment := range []string{
		"Piagam MR aktif",
		"80%",
		"teknis",
		"mandat, layanan, atau proses yang tertulis atau tersirat dari Piagam MR",
		"bahasa generik",
	} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("expected prompt to contain %q", fragment)
		}
	}
}
