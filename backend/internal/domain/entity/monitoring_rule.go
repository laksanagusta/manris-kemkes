package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/timeutil"
)

type MonitoringRule struct {
	ID        uuid.UUID              `json:"id"`
	Name      string                 `json:"name"`
	Year      int                    `json:"year"`
	Frequency string                 `json:"frequency"`
	Active    bool                   `json:"active"`
	InUse     bool                   `json:"inUse"`
	Periods   []MonitoringRulePeriod `json:"periods"`
}

type MonitoringRulePeriod struct {
	ID       uuid.UUID `json:"id"`
	Label    string    `json:"label"`
	Ordinal  int       `json:"ordinal"`
	OpensOn  string    `json:"opensOn"`
	ClosesOn string    `json:"closesOn"`
}

func (r MonitoringRule) Validate() error {
	if strings.TrimSpace(r.Name) == "" || len([]rune(r.Name)) > 120 || r.Year < 1900 || r.Year > 9998 {
		return fmt.Errorf("Nama dan tahun aturan pemantauan harus valid.")
	}
	count := map[string]int{"monthly": 12, "quarterly": 4, "semester": 2}[r.Frequency]
	if count == 0 || len(r.Periods) != count {
		return fmt.Errorf("Jumlah periode harus sesuai frekuensi bulanan (12), triwulan (4), atau semester (2).")
	}
	ordinals := make(map[int]bool, count)
	for i, p := range r.Periods {
		start, err := time.Parse(time.DateOnly, p.OpensOn)
		if err != nil {
			return fmt.Errorf("Tanggal buka periode tidak valid.")
		}
		end, err := time.Parse(time.DateOnly, p.ClosesOn)
		if err != nil {
			return fmt.Errorf("Tanggal tutup periode tidak valid.")
		}
		if strings.TrimSpace(p.Label) == "" || len([]rune(p.Label)) > 160 || p.Ordinal < 1 || p.Ordinal > count || ordinals[p.Ordinal] || end.Before(start) || start.Year() < r.Year || end.Year() > r.Year+1 {
			return fmt.Errorf("Urutan, label, dan rentang periode harus valid dalam tahun profil hingga tahun berikutnya.")
		}
		ordinals[p.Ordinal] = true
		for _, other := range r.Periods[:i] {
			if (p.Ordinal > other.Ordinal && p.OpensOn <= other.ClosesOn) || (p.Ordinal < other.Ordinal && other.OpensOn <= p.ClosesOn) {
				return fmt.Errorf("Rentang pengisian antarperiode tidak boleh tumpang tindih.")
			}
		}
	}
	return nil
}

func (p MonitoringRulePeriod) IsOpen(now time.Time) bool {
	today := now.In(timeutil.JakartaLocation()).Format(time.DateOnly)
	return today >= p.OpensOn && today <= p.ClosesOn
}

// MonitoringPeriodCalendarBounds returns inclusive observation dates. Submission
// dates remain independently configurable through OpensOn and ClosesOn.
func MonitoringPeriodCalendarBounds(year int, frequency string, ordinal int) (time.Time, time.Time, error) {
	count := map[string]int{"monthly": 12, "quarterly": 4, "semester": 2}[frequency]
	if year < 1900 || year > 9998 || count == 0 || ordinal < 1 || ordinal > count {
		return time.Time{}, time.Time{}, fmt.Errorf("Periode kalender tidak valid.")
	}
	months := 12 / count
	start := time.Date(year, time.Month((ordinal-1)*months+1), 1, 0, 0, 0, 0, timeutil.JakartaLocation())
	return start, start.AddDate(0, months, -1), nil
}
