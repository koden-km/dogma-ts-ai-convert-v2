package config_test

import (
	"strings"
	"testing"

	. "github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/internal/test"
)

type validationTestCases []struct {
	Name      string
	Error     string
	Options   []ValidateOption
	Component Component
}

func testValidate(t *testing.T, cases validationTestCases) {
	t.Helper()

	t.Run("func validate()", func(t *testing.T) {
		t.Helper()

		for _, c := range cases {
			t.Run(c.Name, func(t *testing.T) {
				t.Helper()

				var got string
				if err := Validate(c.Component, c.Options...); err != nil {
					got = err.Error()
				}

				test.Expect(
					t,
					"unexpected error",
					got,
					c.Error,
				)
			})
		}
	})
}

func multiline(lines ...string) string {
	return strings.Join(lines, "\n")
}
