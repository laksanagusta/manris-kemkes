package timeutil

import (
	"fmt"
	"os"
	"sync"
	"time"
)

var loadSimulationTime = sync.OnceValues(func() (time.Time, error) {
	value := os.Getenv("MANRIS_SIMULATED_NOW")
	if value == "" {
		return time.Time{}, nil
	}
	if !simulationEnabled {
		return time.Time{}, fmt.Errorf("MANRIS_SIMULATED_NOW requires the manris_simulation build tag")
	}
	at, err := time.Parse(time.RFC3339, value)
	if err != nil || at.IsZero() {
		return time.Time{}, fmt.Errorf("MANRIS_SIMULATED_NOW must be an RFC3339 date and time")
	}
	return at, nil
})

// SimulationTime reads the startup setting once, after configuration is loaded.
// Only a backend compiled with the manris_simulation tag can use the setting.
func SimulationTime() (time.Time, error) {
	return loadSimulationTime()
}

// BusinessNow is the date used for calendar rules such as reporting windows.
func BusinessNow() time.Time {
	at, _ := SimulationTime()
	if !at.IsZero() {
		return at.In(JakartaLocation())
	}
	return time.Now()
}
