package incident

import "testing"

func TestParseLinkedRiskIDs(t *testing.T) {
	t.Run("deduplicates valid ids", func(t *testing.T) {
		ids, err := parseLinkedRiskIDs([]string{
			"8bd413a9-bf31-4f20-b7e4-63a936a45c66",
			"8bd413a9-bf31-4f20-b7e4-63a936a45c66",
			"ca66928f-fae7-49b7-bdd9-b9f6c0418041",
		})
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if len(ids) != 2 {
			t.Fatalf("expected 2 unique ids, got %d", len(ids))
		}
	})

	t.Run("rejects invalid ids", func(t *testing.T) {
		if _, err := parseLinkedRiskIDs([]string{"not-a-uuid"}); err == nil {
			t.Fatal("expected invalid UUID to fail")
		}
	})
}
