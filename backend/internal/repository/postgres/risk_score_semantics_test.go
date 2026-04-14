package postgres

import (
	"testing"
)

func TestRiskScoringUsesBaseScoreOnlyModel(t *testing.T) {
	t.Run("scoring semantics verified in entity", func(t *testing.T) {
		// See internal/domain/entity/risk_test.go for calculation tests
	})
}
