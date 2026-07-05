package postgres

import "testing"

func TestNullableDateString(t *testing.T) {
	blank := " "
	value := "2026-06-30"

	if got := nullableDateString(nil); got != nil {
		t.Fatalf("nil date = %#v, want nil", got)
	}
	if got := nullableDateString(&blank); got != nil {
		t.Fatalf("blank date = %#v, want nil", got)
	}
	if got := nullableDateString(&value); got != value {
		t.Fatalf("date = %#v, want %q", got, value)
	}
}
