package config_test

import (
	"testing"

	"github.com/dogmatiq/dogma"
	. "github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/internal/configbuilder"
	"github.com/dogmatiq/enginekit/config/runtimeconfig"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	"github.com/dogmatiq/enginekit/internal/test"
	"github.com/dogmatiq/enginekit/message"
	"github.com/dogmatiq/enginekit/optional"
)

func TestProjection(t *testing.T) {
	testHandlerWithConcurrencyPreference(
		t,
		configbuilder.Projection,
		runtimeconfig.FromProjection,
		func(fn func(dogma.ProjectionConfigurer)) dogma.ProjectionMessageHandler {
			return &ProjectionMessageHandlerStub{ConfigureFunc: fn}
		},
	)

	testValidate(
		t,
		validationTestCases{
			{
				Name:  "valid",
				Error: ``,
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:  "no runtime values",
				Error: ``,
				Component: configbuilder.Projection(
					func(b *configbuilder.ProjectionBuilder) {
						b.TypeName("pkg.SomeProjection")
						b.Identity(
							func(b *configbuilder.IdentityBuilder) {
								b.Name("name")
								b.Key("494157ef-6f91-45ec-ab19-df61bb96210a")
							},
						)
						b.Route(
							func(b *configbuilder.RouteBuilder) {
								b.RouteType(HandlesEventRouteType)
								b.MessageTypeName("pkg.SomeEvent")
							},
						)
					},
				),
			},
			{
				Name: "no runtime values with ForExecution() option",
				Error: multiline(
					`projection:SomeProjection is invalid:`,
					`  - dogma.ProjectionMessageHandler value is unavailable`,
					`  - route:handles-event:SomeEvent is invalid:`,
					`      - message type ID is unavailable`,
					`      - message type is unavailable`,
				),
				Options: []ValidateOption{
					ForExecution(),
				},
				Component: configbuilder.Projection(
					func(b *configbuilder.ProjectionBuilder) {
						b.TypeName("pkg.SomeProjection")
						b.Identity(
							func(b *configbuilder.IdentityBuilder) {
								b.Name("name")
								b.Key("494157ef-6f91-45ec-ab19-df61bb96210a")
							},
						)
						b.Route(
							func(b *configbuilder.RouteBuilder) {
								b.RouteType(HandlesEventRouteType)
								b.MessageTypeName("pkg.SomeEvent")
							},
						)
					},
				),
			},
			{
				Name: "nil projection",
				Error: multiline(
					`projection is invalid:`,
					`  - could not evaluate entire configuration`,
					`  - no identity`,
					`  - no handles-event routes`,
				),
				Component: runtimeconfig.FromProjection(nil),
			},
			{
				Name: "unconfigured projection",
				Error: multiline(
					`projection:ProjectionMessageHandlerStub is invalid:`,
					`  - no identity`,
					`  - no handles-event routes`,
				),
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{}),
			},
			{
				Name:  "projection identity must be valid",
				Error: `projection:ProjectionMessageHandlerStub is invalid: identity:name/non-uuid is invalid: invalid key ("non-uuid"), expected an RFC 4122/9562 UUID`,
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("name", "non-uuid")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:  "projection must not have multiple identities",
				Error: `projection:ProjectionMessageHandlerStub is invalid: multiple identities`,
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("foo", "63bd2756-2397-4cae-b33b-96e809b384d8")
						c.Identity("foo", "63bd2756-2397-4cae-b33b-96e809b384d8")
						c.Identity("bar", "ee316cdb-894c-454e-91dd-ec0cc4531c42")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:  "projection must handle at least one event type",
				Error: `projection:ProjectionMessageHandlerStub is invalid: no handles-event routes`,
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("handler", "d1e04684-ec56-44a7-8c7d-f111b2d6b2d2")
						// <-- MISSING HandlesEvent ROUTE
					},
				}),
			},
			{
				Name:  "projection must not have multiple routes for the same event type",
				Error: `projection:ProjectionMessageHandlerStub is invalid: multiple handles-event routes for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("handler", "d1e04684-ec56-44a7-8c7d-f111b2d6b2d2")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](), // <-- SAME MESSAGE TYPE
							dogma.HandlesEvent[*EventStub[TypeA]](), // <-- SAME MESSAGE TYPE
						)
					},
				}),
			},
			{
				Name:  "unsupported route type",
				Error: `projection:SomeProjection is invalid: unsupported schedules-deadline route for pkg.SomeDeadline`,
				Component: configbuilder.Projection(
					func(b *configbuilder.ProjectionBuilder) {
						b.TypeName("pkg.SomeProjection")
						b.Identity(
							func(b *configbuilder.IdentityBuilder) {
								b.Name("name")
								b.Key("494157ef-6f91-45ec-ab19-df61bb96210a")
							},
						)
						b.Route(
							func(b *configbuilder.RouteBuilder) {
								b.RouteType(HandlesEventRouteType)
								b.MessageTypeName("pkg.SomeEvent")
							},
						)
						b.Route(
							func(b *configbuilder.RouteBuilder) {
								b.RouteType(SchedulesDeadlineRouteType) // <-- UNSUPPORTED ROUTE TYPE
								b.MessageTypeName("pkg.SomeDeadline")
							},
						)
					},
				),
			},
		},
	)

	testDescribe(
		t,
		describeTestCases{
			{
				Name:   "complete",
				String: `projection:ProjectionMessageHandlerStub`,
				Description: multiline(
					`valid projection *github.com/dogmatiq/enginekit/enginetest/stubs.ProjectionMessageHandlerStub`,
					`  - valid identity name/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
					`  - valid handles-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - valid concurrency preference, set to dogma.MinimizeConcurrency`,
				),
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
						)
						c.ConcurrencyPreference(dogma.MinimizeConcurrency)
					},
				}),
			},
			{
				Name:   "disabled",
				String: `projection:ProjectionMessageHandlerStub`,
				Description: multiline(
					`valid projection *github.com/dogmatiq/enginekit/enginetest/stubs.ProjectionMessageHandlerStub`,
					`  - valid identity name/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
					`  - valid handles-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - valid disabled flag, set to true`,
				),
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
						)
						c.Disable()
					},
				}),
			},
			{
				Name:   "no runtime values",
				String: `projection:SomeProjection`,
				Description: multiline(
					`valid projection pkg.SomeProjection (value unavailable)`,
					`  - valid identity name/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
					`  - valid handles-event route for pkg.SomeEvent (type unavailable)`,
				),
				Component: configbuilder.Projection(func(b *configbuilder.ProjectionBuilder) {
					b.TypeName("pkg.SomeProjection")
					b.Identity(func(b *configbuilder.IdentityBuilder) {
						b.Name("name")
						b.Key("19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					})
					b.Route(func(b *configbuilder.RouteBuilder) {
						b.RouteType(HandlesEventRouteType)
						b.MessageTypeName("pkg.SomeEvent")
					})
				}),
			},
			{
				Name:   "empty",
				String: `projection`,
				Description: multiline(
					`invalid projection`,
					`  - no identity`,
					`  - no handles-event routes`,
				),
				Component: &Projection{},
			},
			{
				Name:   "invalid",
				String: `projection:ProjectionMessageHandlerStub`,
				Description: multiline(
					`invalid projection *github.com/dogmatiq/enginekit/enginetest/stubs.ProjectionMessageHandlerStub`,
					`  - no handles-event routes`,
					`  - valid identity name/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
				),
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					},
				}),
			},
			{
				Name:   "invalid sub-component",
				String: `projection:ProjectionMessageHandlerStub`,
				Description: multiline(
					`valid projection *github.com/dogmatiq/enginekit/enginetest/stubs.ProjectionMessageHandlerStub`,
					`  - invalid identity name/non-uuid`,
					`      - invalid key ("non-uuid"), expected an RFC 4122/9562 UUID`,
					`  - valid handles-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				),
				Component: runtimeconfig.FromProjection(&ProjectionMessageHandlerStub{
					ConfigureFunc: func(c dogma.ProjectionConfigurer) {
						c.Identity("name", "non-uuid")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
						)
					},
				}),
			},
		},
	)

	t.Run("func RouteSet()", func(t *testing.T) {
		t.Run("it returns the normalized routes", func(t *testing.T) {
			h := &ProjectionMessageHandlerStub{
				ConfigureFunc: func(c dogma.ProjectionConfigurer) {
					c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					c.Routes(
						dogma.HandlesEvent[*EventStub[TypeA]](),
					)
				},
			}

			handler := runtimeconfig.FromProjection(h)

			test.Expect(
				t,
				"unexpected routes",
				handler.RouteSet().MessageTypes(),
				map[message.Type]RouteDirection{
					message.TypeFor[*EventStub[TypeA]](): InboundDirection,
				},
			)
		})

		t.Run("it panics if the routes are invalid", func(t *testing.T) {
			cases := []struct {
				Name  string
				Want  string
				Route *Route
			}{
				{
					"empty route",
					`route is invalid: route type is unavailable`,
					&Route{},
				},
				{
					"unsupported HandlesCommand route",
					`unsupported handles-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					&Route{
						RouteType:       optional.Some(HandlesCommandRouteType),
						MessageTypeID:   optional.Some(MessageTypeID[*CommandStub[TypeA]]()),
						MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
						MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
					},
				},
				{
					"unsupported ExecutesCommand route",
					`unsupported executes-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					&Route{
						RouteType:       optional.Some(ExecutesCommandRouteType),
						MessageTypeID:   optional.Some(MessageTypeID[*CommandStub[TypeA]]()),
						MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
						MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
					},
				},
				{
					"unsupported RecordsEvent route",
					`unsupported records-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					&Route{
						RouteType:       optional.Some(RecordsEventRouteType),
						MessageTypeID:   optional.Some(MessageTypeID[*EventStub[TypeA]]()),
						MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
						MessageType:     optional.Some(message.TypeFor[*EventStub[TypeA]]()),
					},
				},
				{
					"unsupported SchedulesDeadline route",
					`unsupported schedules-deadline route for *github.com/dogmatiq/enginekit/enginetest/stubs.DeadlineStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					&Route{
						RouteType:       optional.Some(SchedulesDeadlineRouteType),
						MessageTypeID:   optional.Some(MessageTypeID[*DeadlineStub[TypeA]]()),
						MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.DeadlineStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
						MessageType:     optional.Some(message.TypeFor[*DeadlineStub[TypeA]]()),
					},
				},
			}

			for _, c := range cases {
				t.Run(c.Name, func(t *testing.T) {
					handler := &Projection{
						HandlerCommon: HandlerCommon{
							RouteComponents: []*Route{c.Route},
						},
					}

					test.ExpectPanic(
						t,
						c.Want,
						func() {
							handler.RouteSet()
						},
					)
				})
			}
		})
	})

	t.Run("func Validate()", func(t *testing.T) {
		t.Run("it panics if the source is present but the typename is not", func(t *testing.T) {
			test.ExpectPanic(
				t,
				`malformed configuration representation: there is a problem with the *config.Projection value (and not necessarily the configuration it represents): Source is present, but TypeName is not`,
				func() {
					Validate(&Projection{
						Source: optional.Some[dogma.ProjectionMessageHandler](
							&ProjectionMessageHandlerStub{},
						),
					})
				},
			)
		})
	})

	t.Run("func Implementation()", func(t *testing.T) {
		t.Run("it returns the unwrapped handler", func(t *testing.T) {
			inner := &ProjectionMessageHandlerStub{
				ConfigureFunc: func(c dogma.ProjectionConfigurer) {
					c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					c.Routes(
						dogma.HandlesEvent[*EventStub[TypeA]](),
					)
				},
			}

			cfg := runtimeconfig.FromProjection(inner)

			if cfg.Implementation() != inner {
				t.Fatal("expected Implementation() to return the unwrapped handler")
			}
		})
	})
}
