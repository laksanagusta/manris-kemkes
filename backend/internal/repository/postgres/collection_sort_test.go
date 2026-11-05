package postgres

import "testing"

func TestCollectionOrderByAllowlist(t *testing.T) {
	columns := map[string]string{"name": "u.name", "created_at": "u.created_at"}
	for _, tc := range []struct{ key, dir, want string }{
		{"name", "asc", "u.name ASC NULLS LAST, u.id DESC"},
		{"created_at", "desc", "u.created_at DESC NULLS LAST, u.id DESC"},
		{"name; DROP TABLE users", "desc; DROP TABLE users", "u.created_at DESC NULLS LAST, u.id DESC"},
	} {
		if got := collectionOrderBy(tc.key, tc.dir, "u.created_at", "u.id", columns); got != tc.want {
			t.Fatalf("got %s, want %s", got, tc.want)
		}
	}
}
