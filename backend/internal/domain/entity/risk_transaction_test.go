package entity

import "testing"

func TestMonitoringTransactionKind(t *testing.T) {
	m := NewRiskMonitoringDraft(&Risk{}, "2026-Q1", [16]byte{})
	if m.TransactionKind != "monitoring" {
		t.Fatalf("kind=%s", m.TransactionKind)
	}
}
