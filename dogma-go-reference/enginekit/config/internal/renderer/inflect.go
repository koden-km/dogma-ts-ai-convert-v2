package renderer

import (
	"fmt"
	"strings"
)

// Inflect returns a string with grammatical corrections applied.
func Inflect(format string, args ...any) string {
	s := fmt.Sprintf(format, args...)

	s = strings.ReplaceAll(
		s,
		"a event",
		"an event",
	)

	return s
}
