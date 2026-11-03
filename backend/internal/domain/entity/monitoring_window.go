package entity

import (
	"fmt"
	"github.com/manris/backend/internal/timeutil"
	"strconv"
	"time"
)

// MonitoringWindow is half-open: next quarter's first month in Jakarta.
func MonitoringWindow(cycle string) (time.Time, time.Time, error) {
	if len(cycle) != 7 || cycle[4:6] != "-Q" {
		return time.Time{}, time.Time{}, fmt.Errorf("periode triwulan tidak valid")
	}
	year, e := strconv.Atoi(cycle[:4])
	q, qe := strconv.Atoi(cycle[6:])
	if e != nil || qe != nil || year < 1 || q < 1 || q > 4 {
		return time.Time{}, time.Time{}, fmt.Errorf("periode triwulan tidak valid")
	}
	start := time.Date(year, time.Month(q*3+1), 1, 0, 0, 0, 0, timeutil.JakartaLocation())
	return start, start.AddDate(0, 1, 0), nil
}
func MonitoringWindowOpen(cycle string, now time.Time) bool {
	start, end, err := MonitoringWindow(cycle)
	return err == nil && !now.Before(start) && now.Before(end)
}
