package config_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/optional"
)

func TestIdentity(t *testing.T) {
	testValidate(
		t,
		validationTestCases{
			{
				Name:  "valid",
				Error: ``,
				Component: &Identity{
					Name: optional.Some("name"),
					Key:  optional.Some("2da5eec5-374e-4716-b1c7-f24abd8df57f"),
				},
			},
			{
				Name:  "valid with name containing non-ASCII characters",
				Error: ``,
				Component: &Identity{
					Name: optional.Some("😀"),
					Key:  optional.Some("79f63053-1ca6-4537-974f-dd0121eb5195"),
				},
			},
			{
				Name: "empty",
				Error: multiline(
					`identity is invalid:`,
					`  - name is unavailable`,
					`  - key is unavailable`,
				),
				Component: &Identity{},
			},
			{
				Name:  "speculative",
				Error: ``,
				Component: &Identity{
					ComponentCommon: ComponentCommon{
						IsSpeculative: true,
					},
					Name: optional.Some("name"),
					Key:  optional.Some("e6b691dd-731c-4c14-8e1c-1622381202dc"),
				},
			},
			{
				Name:  "speculative with ForExecution() option",
				Error: `identity:name/e6b691dd-731c-4c14-8e1c-1622381202dc is invalid: conditions for the component's inclusion in the configuration could not be evaluated`,
				Options: []ValidateOption{
					ForExecution(),
				},
				Component: &Identity{
					ComponentCommon: ComponentCommon{
						IsSpeculative: true,
					},
					Name: optional.Some("name"),
					Key:  optional.Some("e6b691dd-731c-4c14-8e1c-1622381202dc"),
				},
			},
			{
				Name:  "partial",
				Error: `identity:name/e6b691dd-731c-4c14-8e1c-1622381202dc is invalid: could not evaluate entire configuration`,
				Component: &Identity{
					// It's possibly non-sensical to have an identity that contains
					// both it's name and key be considered incomplete, but this
					// allows us to represent a case where the name and key are
					// build dynamically and we don't have the _entire_ string.
					ComponentCommon: ComponentCommon{
						IsPartial: true,
					},
					Name: optional.Some("name"),
					Key:  optional.Some("e6b691dd-731c-4c14-8e1c-1622381202dc"),
				},
			},
			{
				Name:  "empty name",
				Error: `identity:""/c79d01bb-b289-4e5d-b2fd-9779f33b3a19 is invalid: invalid name (""), expected a non-empty, printable UTF-8 string with no whitespace`,
				Component: &Identity{
					Name: optional.Some(""),
					Key:  optional.Some("c79d01bb-b289-4e5d-b2fd-9779f33b3a19"),
				},
			},
			{
				Name:  "name containing spaces",
				Error: `identity:"the name"/c405f1e2-b309-4a43-84bf-5a1f8e7656b8 is invalid: invalid name ("the name"), expected a non-empty, printable UTF-8 string with no whitespace`,
				Component: &Identity{
					Name: optional.Some("the name"),
					Key:  optional.Some("c405f1e2-b309-4a43-84bf-5a1f8e7656b8"),
				},
			},
			{
				Name:  "name containing non-printable characters",
				Error: `identity:"name\n"/79f63053-1ca6-4537-974f-dd0121eb5195 is invalid: invalid name ("name\n"), expected a non-empty, printable UTF-8 string with no whitespace`,
				Component: &Identity{
					Name: optional.Some("name\n"),
					Key:  optional.Some("79f63053-1ca6-4537-974f-dd0121eb5195"),
				},
			},
			{
				Name:  "empty key",
				Error: `identity:name/"" is invalid: invalid key (""), expected an RFC 4122/9562 UUID`,
				Component: &Identity{
					Name: optional.Some("name"),
					Key:  optional.Some(""),
				},
			},
			{
				Name:  "non-UUID key",
				Error: `identity:name/_b4ac052-68b1-4877-974e-c437aceb7f3f is invalid: invalid key ("_b4ac052-68b1-4877-974e-c437aceb7f3f"), expected an RFC 4122/9562 UUID`,
				Component: &Identity{
					Name: optional.Some("name"),
					Key:  optional.Some("_b4ac052-68b1-4877-974e-c437aceb7f3f"),
				},
			},
		},
	)

	testDescribe(
		t,
		describeTestCases{
			{
				Name:        "valid",
				String:      `identity:name/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
				Description: `valid identity name/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
				Component: &Identity{
					Name: optional.Some("name"),
					Key:  optional.Some("2da5eec5-374e-4716-b1c7-f24abd8df57f"),
				},
			},
			{
				Name:   "empty",
				String: `identity`,
				Description: multiline(
					`incomplete identity`,
					`  - name is unavailable`,
					`  - key is unavailable`,
				),
				Component: &Identity{},
			},
			{
				Name:   "missing name",
				String: `identity:?/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
				Description: multiline(
					`incomplete identity ?/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
					`  - name is unavailable`,
				),
				Component: &Identity{
					Key: optional.Some("2da5eec5-374e-4716-b1c7-f24abd8df57f"),
				},
			},
			{
				Name:   "invalid name",
				String: `identity:"\b"/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
				Description: multiline(
					`invalid identity "\b"/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
					`  - invalid name ("\b"), expected a non-empty, printable UTF-8 string with no whitespace`,
				),
				Component: &Identity{
					Name: optional.Some("\b"),
					Key:  optional.Some("2da5eec5-374e-4716-b1c7-f24abd8df57f"),
				},
			},
			{
				Name:   "missing key",
				String: `identity:name/?`,
				Description: multiline(
					`incomplete identity name/?`,
					`  - key is unavailable`,
				),
				Component: &Identity{
					Name: optional.Some("name"),
				},
			},
			{
				Name:   "invalid key",
				String: `identity:name/key`,
				Description: multiline(
					`invalid identity name/key`,
					`  - invalid key ("key"), expected an RFC 4122/9562 UUID`,
				),
				Component: &Identity{
					Name: optional.Some("name"),
					Key:  optional.Some("key"),
				},
			},
			{
				Name:        "non-canonical key",
				String:      `identity:name/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
				Description: `valid identity name/2DA5EEC5-374E-4716-B1C7-F24ABD8DF57F (non-canonical)`,
				Component: &Identity{
					Name: optional.Some("name"),
					Key:  optional.Some("2DA5EEC5-374E-4716-B1C7-F24ABD8DF57F"),
				},
			},
			{
				Name:        "speculative",
				String:      `identity:name/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
				Description: `valid speculative identity name/2da5eec5-374e-4716-b1c7-f24abd8df57f`,
				Component: &Identity{
					ComponentCommon: ComponentCommon{
						IsSpeculative: true,
					},
					Name: optional.Some("name"),
					Key:  optional.Some("2da5eec5-374e-4716-b1c7-f24abd8df57f"),
				},
			},
		},
	)
}
