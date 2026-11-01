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

func TestProcess(t *testing.T) {
	testHandler(
		t,
		configbuilder.Process,
		runtimeconfig.FromProcess[dogma.ProcessRoot],
		func(fn func(dogma.ProcessConfigurer)) dogma.ProcessMessageHandler[dogma.ProcessRoot] {
			return dogma.UntypedProcessMessageHandler(&ProcessMessageHandlerStub[*ProcessRootStub]{ConfigureFunc: fn})
		},
	)

	testValidate(
		t,
		validationTestCases{
			{
				Name:  "valid",
				Error: ``,
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
							dogma.SchedulesDeadline[*DeadlineStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:  "no runtime values",
				Error: ``,
				Component: configbuilder.Process(
					func(b *configbuilder.ProcessBuilder) {
						b.TypeName("pkg.SomeProcess")
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
								b.RouteType(ExecutesCommandRouteType)
								b.MessageTypeName("pkg.SomeCommand")
							},
						)
					},
				),
			},
			{
				Name: "no runtime values with ForExecution() option",
				Error: multiline(
					`process:SomeProcess is invalid:`,
					`  - dogma.ProcessMessageHandler[github.com/dogmatiq/dogma.ProcessRoot] value is unavailable`,
					`  - route:handles-event:SomeEvent is invalid:`,
					`      - message type ID is unavailable`,
					`      - message type is unavailable`,
					`  - route:executes-command:SomeCommand is invalid:`,
					`      - message type ID is unavailable`,
					`      - message type is unavailable`,
				),
				Options: []ValidateOption{
					ForExecution(),
				},
				Component: configbuilder.Process(
					func(b *configbuilder.ProcessBuilder) {
						b.TypeName("pkg.SomeProcess")
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
								b.RouteType(ExecutesCommandRouteType)
								b.MessageTypeName("pkg.SomeCommand")
							},
						)
					},
				),
			},
			{
				Name: "nil process",
				Error: multiline(
					`process is invalid:`,
					`  - could not evaluate entire configuration`,
					`  - no identity`,
					`  - no handles-event routes`,
					`  - no executes-command routes`,
				),
				Component: runtimeconfig.FromProcess[*ProcessRootStub](nil),
			},
			{
				Name: "unconfigured process",
				Error: multiline(
					`process:ProcessMessageHandlerStub[ProcessRootStub] is invalid:`,
					`  - no identity`,
					`  - no handles-event routes`,
					`  - no executes-command routes`,
				),
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{}),
			},
			{
				Name:  "process identity must be valid",
				Error: `process:ProcessMessageHandlerStub[ProcessRootStub] is invalid: identity:name/non-uuid is invalid: invalid key ("non-uuid"), expected an RFC 4122/9562 UUID`,
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("name", "non-uuid")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:  "process must not have multiple identities",
				Error: `process:ProcessMessageHandlerStub[ProcessRootStub] is invalid: multiple identities`,
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("foo", "63bd2756-2397-4cae-b33b-96e809b384d8")
						c.Identity("foo", "63bd2756-2397-4cae-b33b-96e809b384d8")
						c.Identity("bar", "ee316cdb-894c-454e-91dd-ec0cc4531c42")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:  "process must handle at least one event type",
				Error: `process:ProcessMessageHandlerStub[ProcessRootStub] is invalid: no handles-event routes`,
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("handler", "d1e04684-ec56-44a7-8c7d-f111b2d6b2d2")
						c.Routes(
							// <-- MISSING HandlesEvent ROUTE
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:  "process must execute at least one command type",
				Error: `process:ProcessMessageHandlerStub[ProcessRootStub] is invalid: no executes-command routes`,
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("handler", "d1e04684-ec56-44a7-8c7d-f111b2d6b2d2")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							// <-- MISSING ExecutesCommand ROUTE
						)
					},
				}),
			},
			{
				Name:  "process must not have multiple routes for the same event type",
				Error: `process:ProcessMessageHandlerStub[ProcessRootStub] is invalid: multiple handles-event routes for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("handler", "d1e04684-ec56-44a7-8c7d-f111b2d6b2d2")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](), // <-- SAME MESSAGE TYPE
							dogma.HandlesEvent[*EventStub[TypeA]](), // <-- SAME MESSAGE TYPE
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:  "process must not have multiple routes for the same command type",
				Error: `process:ProcessMessageHandlerStub[ProcessRootStub] is invalid: multiple executes-command routes for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("handler", "d1e04684-ec56-44a7-8c7d-f111b2d6b2d2")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							dogma.ExecutesCommand[*CommandStub[TypeA]](), // <-- SAME MESSAGE TYPE
							dogma.ExecutesCommand[*CommandStub[TypeA]](), // <-- SAME MESSAGE TYPE
						)
					},
				}),
			},
			{
				Name:  "process must not have multiple routes for the same deadline type",
				Error: `process:ProcessMessageHandlerStub[ProcessRootStub] is invalid: multiple schedules-deadline routes for *github.com/dogmatiq/enginekit/enginetest/stubs.DeadlineStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("handler", "d1e04684-ec56-44a7-8c7d-f111b2d6b2d2")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
							dogma.SchedulesDeadline[*DeadlineStub[TypeA]](), // <-- SAME MESSAGE TYPE
							dogma.SchedulesDeadline[*DeadlineStub[TypeA]](), // <-- SAME MESSAGE TYPE
						)
					},
				}),
			},
			{
				Name:  "unsupported route type",
				Error: `process:SomeProcess is invalid: unsupported records-event route for pkg.SomeOtherEvent`,
				Component: configbuilder.Process(
					func(b *configbuilder.ProcessBuilder) {
						b.TypeName("pkg.SomeProcess")
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
								b.RouteType(ExecutesCommandRouteType)
								b.MessageTypeName("pkg.SomeCommand")
							},
						)
						b.Route(
							func(b *configbuilder.RouteBuilder) {
								b.RouteType(SchedulesDeadlineRouteType)
								b.MessageTypeName("pkg.SomeDeadline")
							},
						)
						b.Route(
							func(b *configbuilder.RouteBuilder) {
								b.RouteType(RecordsEventRouteType) // <-- UNSUPPORTED ROUTE TYPE
								b.MessageTypeName("pkg.SomeOtherEvent")
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
				String: `process:ProcessMessageHandlerStub[ProcessRootStub]`,
				Description: multiline(
					`valid process *github.com/dogmatiq/enginekit/enginetest/stubs.ProcessMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.ProcessRootStub]`,
					`  - valid identity name/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
					`  - valid handles-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - valid executes-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - valid schedules-deadline route for *github.com/dogmatiq/enginekit/enginetest/stubs.DeadlineStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				),
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
							dogma.SchedulesDeadline[*DeadlineStub[TypeA]](),
						)
					},
				}),
			},
			{
				Name:   "disabled",
				String: `process:ProcessMessageHandlerStub[ProcessRootStub]`,
				Description: multiline(
					`valid process *github.com/dogmatiq/enginekit/enginetest/stubs.ProcessMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.ProcessRootStub]`,
					`  - valid identity name/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
					`  - valid handles-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - valid executes-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - valid disabled flag, set to true`,
				),
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
						)
						c.Disable()
					},
				}),
			},
			{
				Name:   "no runtime values",
				String: `process:SomeProcess`,
				Description: multiline(
					`valid process pkg.SomeProcess (value unavailable)`,
					`  - valid identity name/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
					`  - valid handles-event route for pkg.SomeEvent (type unavailable)`,
					`  - valid executes-command route for pkg.SomeCommand (type unavailable)`,
					`  - valid schedules-deadline route for pkg.SomeDeadline (type unavailable)`,
				),
				Component: configbuilder.Process(func(b *configbuilder.ProcessBuilder) {
					b.TypeName("pkg.SomeProcess")
					b.Identity(func(b *configbuilder.IdentityBuilder) {
						b.Name("name")
						b.Key("19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					})
					b.Route(func(b *configbuilder.RouteBuilder) {
						b.RouteType(HandlesEventRouteType)
						b.MessageTypeName("pkg.SomeEvent")
					})
					b.Route(func(b *configbuilder.RouteBuilder) {
						b.RouteType(ExecutesCommandRouteType)
						b.MessageTypeName("pkg.SomeCommand")
					})
					b.Route(func(b *configbuilder.RouteBuilder) {
						b.RouteType(SchedulesDeadlineRouteType)
						b.MessageTypeName("pkg.SomeDeadline")
					})
				}),
			},
			{
				Name:   "empty",
				String: `process`,
				Description: multiline(
					`invalid process`,
					`  - no identity`,
					`  - no handles-event routes`,
					`  - no executes-command routes`,
				),
				Component: &Process{},
			},
			{
				Name:   "invalid",
				String: `process:ProcessMessageHandlerStub[ProcessRootStub]`,
				Description: multiline(
					`invalid process *github.com/dogmatiq/enginekit/enginetest/stubs.ProcessMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.ProcessRootStub]`,
					`  - no handles-event routes`,
					`  - no executes-command routes`,
					`  - valid identity name/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
				),
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					},
				}),
			},
			{
				Name:   "invalid sub-component",
				String: `process:ProcessMessageHandlerStub[ProcessRootStub]`,
				Description: multiline(
					`valid process *github.com/dogmatiq/enginekit/enginetest/stubs.ProcessMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.ProcessRootStub]`,
					`  - invalid identity name/non-uuid`,
					`      - invalid key ("non-uuid"), expected an RFC 4122/9562 UUID`,
					`  - valid handles-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - valid executes-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				),
				Component: runtimeconfig.FromProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
					ConfigureFunc: func(c dogma.ProcessConfigurer) {
						c.Identity("name", "non-uuid")
						c.Routes(
							dogma.HandlesEvent[*EventStub[TypeA]](),
							dogma.ExecutesCommand[*CommandStub[TypeA]](),
						)
					},
				}),
			},
		},
	)

	t.Run("func RouteSet()", func(t *testing.T) {
		t.Run("it returns the normalized routes", func(t *testing.T) {
			h := &ProcessMessageHandlerStub[*ProcessRootStub]{
				ConfigureFunc: func(c dogma.ProcessConfigurer) {
					c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					c.Routes(
						dogma.HandlesEvent[*EventStub[TypeA]](),
						dogma.ExecutesCommand[*CommandStub[TypeA]](),
					)
				},
			}

			handler := runtimeconfig.FromProcess(h)

			test.Expect(
				t,
				"unexpected routes",
				handler.RouteSet().MessageTypes(),
				map[message.Type]RouteDirection{
					message.TypeFor[*EventStub[TypeA]]():   InboundDirection,
					message.TypeFor[*CommandStub[TypeA]](): OutboundDirection,
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
					"unexpected HandlesCommand route",
					`unsupported handles-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					&Route{
						RouteType:       optional.Some(HandlesCommandRouteType),
						MessageTypeID:   optional.Some(MessageTypeID[*CommandStub[TypeA]]()),
						MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
						MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
					},
				},
				{
					"unexpected RecordsEvent route",
					`unsupported records-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					&Route{
						RouteType:       optional.Some(RecordsEventRouteType),
						MessageTypeID:   optional.Some(MessageTypeID[*EventStub[TypeA]]()),
						MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
						MessageType:     optional.Some(message.TypeFor[*EventStub[TypeA]]()),
					},
				},
			}

			for _, c := range cases {
				t.Run(c.Name, func(t *testing.T) {
					handler := &Process{
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
				`malformed configuration representation: there is a problem with the *config.Process value (and not necessarily the configuration it represents): Source is present, but TypeName is not`,
				func() {
					Validate(&Process{
						Source: optional.Some[dogma.ProcessMessageHandler[dogma.ProcessRoot]](
							&ProcessMessageHandlerStub[dogma.ProcessRoot]{},
						),
					})
				},
			)
		})
	})

	t.Run("func Implementation()", func(t *testing.T) {
		t.Run("it returns the unwrapped handler", func(t *testing.T) {
			inner := &ProcessMessageHandlerStub[*ProcessRootStub]{
				ConfigureFunc: func(c dogma.ProcessConfigurer) {
					c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					c.Routes(
						dogma.HandlesEvent[*EventStub[TypeA]](),
						dogma.ExecutesCommand[*CommandStub[TypeA]](),
						dogma.SchedulesDeadline[*DeadlineStub[TypeA]](),
					)
				},
			}

			cfg := runtimeconfig.FromProcess(inner)

			if cfg.Implementation() != inner {
				t.Fatal("expected Implementation() to return the unwrapped handler")
			}
		})
	})
}
