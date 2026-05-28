package timeutil

import (
	"errors"
	"testing"
	"time"
)

func TestJakartaLocationFallsBackWhenLoadFails(t *testing.T) {
	oldLoadLocation := loadLocation
	loadLocation = func(string) (*time.Location, error) {
		return nil, errors.New("timezone database unavailable")
	}
	defer func() {
		loadLocation = oldLoadLocation
	}()

	loc := JakartaLocation()
	if loc == nil {
		t.Fatal("expected fallback location, got nil")
	}
	if got := loc.String(); got != "WIB" {
		t.Fatalf("expected WIB fallback, got %q", got)
	}

	_, offset := time.Now().In(loc).Zone()
	if offset != 7*60*60 {
		t.Fatalf("expected +07:00 offset, got %d", offset)
	}
}

func TestJakartaLocationUsesLoadedLocationWhenAvailable(t *testing.T) {
	oldLoadLocation := loadLocation
	expected := time.FixedZone("Asia/Jakarta", 7*60*60)
	loadLocation = func(string) (*time.Location, error) {
		return expected, nil
	}
	defer func() {
		loadLocation = oldLoadLocation
	}()

	loc := JakartaLocation()
	if loc != expected {
		t.Fatalf("expected loaded location to be returned, got %v", loc)
	}
}
