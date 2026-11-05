package postgres

import "strings"

// Only static allowlisted SQL expressions can enter ORDER BY. Values never become SQL.
func collectionOrderBy(key, direction, fallback, id string, columns map[string]string) string {
	column, ok := columns[key]
	if !ok {
		column = fallback
	}
	order := "DESC"
	if strings.EqualFold(direction, "asc") {
		order = "ASC"
	}
	return column + " " + order + " NULLS LAST, " + id + " DESC"
}
