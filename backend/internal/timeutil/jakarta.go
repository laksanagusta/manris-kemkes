package timeutil

import "time"

const jakartaLocationName = "Asia/Jakarta"

var loadLocation = time.LoadLocation

// JakartaLocation returns the Jakarta timezone and falls back to WIB if the
// system timezone database is unavailable in production containers.
func JakartaLocation() *time.Location {
	loc, err := loadLocation(jakartaLocationName)
	if err == nil && loc != nil {
		return loc
	}
	return time.FixedZone("WIB", 7*60*60)
}
