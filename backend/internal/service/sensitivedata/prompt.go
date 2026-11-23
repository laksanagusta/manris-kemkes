package sensitivedata

import (
	"encoding/json"
	"regexp"
)

var promptJSONString = regexp.MustCompile(`"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`)

// ValidateAIPrompt checks provider-bound text, including JSON fragments embedded
// in a prompt. Agent tool responses contain JSON inside a JSON string, so check
// both decoded layers in addition to the original text.
func ValidateAIPrompt(fields ...string) error {
	for _, field := range fields {
		if err := validateAIPrompt(field); err != nil {
			return err
		}
	}
	return nil
}

func validateAIPrompt(text string) error {
	for depth := 0; ; depth++ {
		if err := Validate(text, AIInput); err != nil {
			return err
		}
		if depth == 2 {
			return nil
		}
		decoded := promptJSONString.ReplaceAllStringFunc(text, func(token string) string {
			var value string
			if err := json.Unmarshal([]byte(token), &value); err != nil {
				return token
			}
			return value
		})
		if decoded == text {
			return nil
		}
		text = decoded
	}
}
