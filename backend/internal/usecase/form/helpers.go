package form

import (
	"regexp"
	"strings"

	"github.com/google/uuid"
)

type SectionInput struct {
	Title       string
	Description *string
	Position    int
	Fields      []FieldInput
}

type FieldInput struct {
	FieldType              string
	Label                  string
	Placeholder            *string
	IsRequired             bool
	Options                []FieldOptionInput
	Position               int
	ConditionSourceFieldID *uuid.UUID
	ConditionValue         *string

	fieldKey string
}

type FieldOptionInput struct {
	Value string
	Label string
}

var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)
var multiUnderscore = regexp.MustCompile(`_+`)

// generateFieldKey converts a label to a slug: lowercase, alphanumeric+underscores, max 50 chars.
func generateFieldKey(label string) string {
	key := strings.ToLower(strings.TrimSpace(label))
	key = nonAlphanumeric.ReplaceAllString(key, "_")
	key = multiUnderscore.ReplaceAllString(key, "_")
	key = strings.Trim(key, "_")
	if len(key) > 50 {
		key = key[:50]
		key = strings.TrimRight(key, "_")
	}
	if key == "" {
		key = "field"
	}
	return key
}

func assignFieldKeys(sections []SectionInput) {
	seen := make(map[string]int)
	for i := range sections {
		for j := range sections[i].Fields {
			base := generateFieldKey(sections[i].Fields[j].Label)
			count := seen[base]
			count++
			seen[base] = count

			if count == 1 {
				sections[i].Fields[j].fieldKey = base
			} else {
				sections[i].Fields[j].fieldKey = truncateKey(base, count)
			}
		}
	}
}

func truncateKey(base string, n int) string {
	suffix := "_" + itoa(n)
	maxBase := 50 - len(suffix)
	if maxBase < 0 {
		maxBase = 0
	}
	if len(base) > maxBase {
		base = strings.TrimRight(base[:maxBase], "_")
	}
	return base + suffix
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	digits := []byte{}
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
