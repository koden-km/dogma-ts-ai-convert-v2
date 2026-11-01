package config_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/internal/test"
)

type describeTestCases []struct {
	Name                string
	String, Description string
	Component           Component
}

func testDescribe(t *testing.T, cases describeTestCases) {
	t.Helper()

	t.Run("func String()", func(t *testing.T) {
		t.Helper()

		for _, c := range cases {
			t.Run(c.Name, func(t *testing.T) {
				t.Helper()

				test.Expect(
					t,
					"unexpected string representation",
					c.Component.String(),
					c.String,
				)
			})
		}
	})

	t.Run("func describe()", func(t *testing.T) {
		t.Helper()

		for _, c := range cases {
			t.Run(c.Name, func(t *testing.T) {
				t.Helper()

				test.Expect(
					t,
					"unexpected string representation",
					Description(
						c.Component,
						WithValidationResult(Validate(c.Component)),
					),
					c.Description+"\n",
				)
			})
		}
	})
}
