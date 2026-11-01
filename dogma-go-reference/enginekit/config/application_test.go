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

func TestApplication(t *testing.T) {
	testEntity(
		t,
		configbuilder.Application,
		runtimeconfig.FromApplication,
		func(fn func(dogma.ApplicationConfigurer)) dogma.Application {
			return &ApplicationStub{ConfigureFunc: fn}
		},
	)

	testValidate(
		t,
		validationTestCases{
			{
				Name:  "application name may be shared with one of its handlers",
				Error: "",
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("name", "14769f7f-87fe-48dd-916e-5bcab6ba6aca") // <-- SAME NAME
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("name", "40ddf2a2-f053-485c-8621-1fc8a58f8ddf") // <-- SAME NAME
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](),
										dogma.RecordsEvent[*EventStub[TypeA]](),
									)
								},
							}),
						)
					},
				}),
			},
			{
				Name:  "multiple processes may schedule the same type of deadline message",
				Error: "",
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("name", "14769f7f-87fe-48dd-916e-5bcab6ba6aca")
						c.Routes(
							dogma.ViaProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
								ConfigureFunc: func(c dogma.ProcessConfigurer) {
									c.Identity("process1", "3614c386-4d8d-4a1d-88fa-10f94313c803")
									c.Routes(
										dogma.HandlesEvent[*EventStub[TypeA]](),
										dogma.ExecutesCommand[*CommandStub[TypeA]](),
										dogma.SchedulesDeadline[*DeadlineStub[TypeA]](), // <-- SAME MESSAGE TYPE
									)
								},
							}),
							dogma.ViaProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
								ConfigureFunc: func(c dogma.ProcessConfigurer) {
									c.Identity("process2", "f2c9acdd-93a8-4ca0-9014-56aaae16a3af")
									c.Routes(
										dogma.HandlesEvent[*EventStub[TypeA]](),
										dogma.ExecutesCommand[*CommandStub[TypeA]](),
										dogma.SchedulesDeadline[*DeadlineStub[TypeA]](), // <-- SAME MESSAGE TYPE
									)
								},
							}),
						)
					},
				}),
			},
			{
				Name: "nil application",
				Error: multiline(
					`application is invalid:`,
					`  - could not evaluate entire configuration`,
					`  - no identity`,
				),
				Component: runtimeconfig.FromApplication(nil),
			},
			{
				Name:      "unconfigured application",
				Error:     `application:ApplicationStub is invalid: no identity`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{}),
			},
			{
				Name:  "application identity must be valid",
				Error: `application:ApplicationStub is invalid: identity:name/non-uuid is invalid: invalid key ("non-uuid"), expected an RFC 4122/9562 UUID`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("name", "non-uuid")
					},
				}),
			},
			{
				Name:  "application must not have multiple identities",
				Error: `application:ApplicationStub is invalid: multiple identities`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("foo", "63bd2756-2397-4cae-b33b-96e809b384d8")
						c.Identity("foo", "63bd2756-2397-4cae-b33b-96e809b384d8")
						c.Identity("bar", "ee316cdb-894c-454e-91dd-ec0cc4531c42")
					},
				}),
			},
			{
				Name:  "application must not contain invalid handlers",
				Error: `application:ApplicationStub is invalid: aggregate:AggregateMessageHandlerStub[AggregateRootStub] is invalid: no handles-command routes`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "14769f7f-87fe-48dd-916e-5bcab6ba6aca")
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("aggregate", "fe78acbf-dfd4-490a-bf99-93b6acf9f891")
									c.Routes(
										// <-- MISSING "handles-command" ROUTE
										dogma.RecordsEvent[*EventStub[TypeA]](),
									)
								},
							}),
						)
					},
				}),
			},
			{
				Name:  "application must not have the same identity key as one of its handlers",
				Error: `application:ApplicationStub is invalid: identity key "14769f7f-87fe-48dd-916e-5bcab6ba6aca" is shared by 2 entities`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "14769f7f-87fe-48dd-916e-5bcab6ba6aca") // <-- SAME IDENTITY KEY
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("aggregate", "14769F7F-87FE-48DD-916E-5BCAB6BA6ACA") // <-- SAME IDENTITY KEY (note: non-canonical UUID)
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](),
										dogma.RecordsEvent[*EventStub[TypeA]](),
									)
								},
							}),
						)
					},
				}),
			},
			{
				Name:  "multiple handlers must not have the same identity name",
				Error: `application:ApplicationStub is invalid: identity name "handler" is shared by 2 entities`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "14769f7f-87fe-48dd-916e-5bcab6ba6aca")
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("handler", "4f2a6c38-0651-4ca5-b6a1-1edf4b2624db") // <-- SAME IDENTITY NAME
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](),
										dogma.RecordsEvent[*EventStub[TypeA]](),
									)
								},
							}),
							dogma.ViaIntegration(&IntegrationMessageHandlerStub{
								ConfigureFunc: func(c dogma.IntegrationConfigurer) {
									c.Identity("handler", "300a00e7-9d8f-4859-b67a-7eb36c7e3d83") // <-- SAME IDENTITY NAME
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeB]](),
										dogma.RecordsEvent[*EventStub[TypeB]](),
									)
								},
							}),
						)
					},
				}),
			},
			{
				Name:  "multiple handlers must not have the same identity key",
				Error: `application:ApplicationStub is invalid: identity key "4f2a6c38-0651-4ca5-b6a1-1edf4b2624db" is shared by 2 entities`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "14769f7f-87fe-48dd-916e-5bcab6ba6aca")
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("aggregate", "4f2a6c38-0651-4ca5-b6a1-1edf4b2624db") // <-- SAME IDENTITY KEY
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](),
										dogma.RecordsEvent[*EventStub[TypeA]](),
									)
								},
							}),
							dogma.ViaIntegration(&IntegrationMessageHandlerStub{
								ConfigureFunc: func(c dogma.IntegrationConfigurer) {
									c.Identity("integration", "4F2A6C38-0651-4CA5-B6A1-1EDF4B2624DB") // <-- SAME IDENTITY NAME (note: non-canonical UUID)
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeB]](),
										dogma.RecordsEvent[*EventStub[TypeB]](),
									)
								},
							}),
						)
					},
				}),
			},
			{
				Name:  "multiple handlers must not handle the same command type",
				Error: `application:ApplicationStub is invalid: handles-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA] is shared by 2 handlers`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "14769f7f-87fe-48dd-916e-5bcab6ba6aca")
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("aggregate", "4f2a6c38-0651-4ca5-b6a1-1edf4b2624db")
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](), // <-- SAME MESSAGE TYPE
										dogma.RecordsEvent[*EventStub[TypeA]](),
									)
								},
							}),
							dogma.ViaIntegration(&IntegrationMessageHandlerStub{
								ConfigureFunc: func(c dogma.IntegrationConfigurer) {
									c.Identity("integration", "1228c8a5-ad60-4e59-81b3-e236c31f12e2")
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](), // <-- SAME MESSAGE TYPE
										dogma.RecordsEvent[*EventStub[TypeB]](),
									)
								},
							}),
						)
					},
				}),
			},
			{
				Name:  "multiple handlers must not record the same event type",
				Error: `application:ApplicationStub is invalid: records-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA] is shared by 2 handlers`,
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "14769f7f-87fe-48dd-916e-5bcab6ba6aca")
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("aggregate", "4f2a6c38-0651-4ca5-b6a1-1edf4b2624db")
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](),
										dogma.RecordsEvent[*EventStub[TypeA]](), // <-- SAME MESSAGE TYPE
									)
								},
							}),
							dogma.ViaIntegration(&IntegrationMessageHandlerStub{
								ConfigureFunc: func(c dogma.IntegrationConfigurer) {
									c.Identity("integration", "1228c8a5-ad60-4e59-81b3-e236c31f12e2")
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeB]](),
										dogma.RecordsEvent[*EventStub[TypeA]](), // <-- SAME MESSAGE TYPE
									)
								},
							}),
						)
					},
				}),
			},
		},
	)

	testDescribe(
		t,
		describeTestCases{
			{
				Name:   "complete",
				String: `application:ApplicationStub`,
				Description: multiline(
					`valid application *github.com/dogmatiq/enginekit/enginetest/stubs.ApplicationStub`,
					`  - valid identity app/c85acb36-e47b-4ef6-b46b-64d847a853b7`,
					`  - valid aggregate *github.com/dogmatiq/enginekit/enginetest/stubs.AggregateMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.AggregateRootStub]`,
					`      - valid identity aggregate/8bb5eaf2-6b36-42bd-a1b3-90c27c9c80d4`,
					`      - valid handles-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`      - valid records-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				),
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "c85acb36-e47b-4ef6-b46b-64d847a853b7")
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("aggregate", "8bb5eaf2-6b36-42bd-a1b3-90c27c9c80d4")
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](),
										dogma.RecordsEvent[*EventStub[TypeA]](),
									)
								},
							}),
						)
					},
				}),
			},
			{
				Name:   "no runtime values",
				String: `application:SomeApplication`,
				Description: multiline(
					`valid application pkg.SomeApplication (value unavailable)`,
					`  - valid identity app/c85acb36-e47b-4ef6-b46b-64d847a853b7`,
				),
				Component: configbuilder.Application(
					func(b *configbuilder.ApplicationBuilder) {
						b.TypeName("pkg.SomeApplication")
						b.Identity(func(b *configbuilder.IdentityBuilder) {
							b.Name("app")
							b.Key("c85acb36-e47b-4ef6-b46b-64d847a853b7")
						})
					},
				),
			},
			{
				Name:   "empty",
				String: `application`,
				Description: multiline(
					`invalid application`,
					`  - no identity`,
				),
				Component: &Application{},
			},
			{
				Name:   "invalid",
				String: `application:ApplicationStub`,
				Description: multiline(
					`invalid application *github.com/dogmatiq/enginekit/enginetest/stubs.ApplicationStub`,
					`  - multiple identities`,
					`  - valid identity app/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
					`  - valid identity app/89864744-89c5-4a80-a2bf-90aaebc467ba`,
				),
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
						c.Identity("app", "89864744-89c5-4a80-a2bf-90aaebc467ba")
					},
				}),
			},
			{
				Name:   "invalid identity",
				String: `application:ApplicationStub`,
				Description: multiline(
					`valid application *github.com/dogmatiq/enginekit/enginetest/stubs.ApplicationStub`,
					`  - invalid identity app/non-uuid`,
					`      - invalid key ("non-uuid"), expected an RFC 4122/9562 UUID`,
				),
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "non-uuid")
					},
				}),
			},
			{
				Name:   "invalid handler",
				String: `application:ApplicationStub`,
				Description: multiline(
					`valid application *github.com/dogmatiq/enginekit/enginetest/stubs.ApplicationStub`,
					`  - valid identity app/19cb98d5-dd17-4daf-ae00-1b413b7b899a`,
					`  - invalid aggregate *github.com/dogmatiq/enginekit/enginetest/stubs.AggregateMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.AggregateRootStub]`,
					`      - no records-event routes`,
					`      - valid identity aggregate/8bb5eaf2-6b36-42bd-a1b3-90c27c9c80d4`,
					`      - valid handles-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				),
				Component: runtimeconfig.FromApplication(&ApplicationStub{
					ConfigureFunc: func(c dogma.ApplicationConfigurer) {
						c.Identity("app", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
						c.Routes(
							dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
								ConfigureFunc: func(c dogma.AggregateConfigurer) {
									c.Identity("aggregate", "8bb5eaf2-6b36-42bd-a1b3-90c27c9c80d4")
									c.Routes(
										dogma.HandlesCommand[*CommandStub[TypeA]](),
									)
								},
							}),
						)
					},
				}),
			},
		},
	)

	t.Run("func HandlerByName()", func(t *testing.T) {
		h := &AggregateMessageHandlerStub[*AggregateRootStub]{
			ConfigureFunc: func(c dogma.AggregateConfigurer) {
				c.Identity("name", "40ddf2a2-f053-485c-8621-1fc8a58f8ddf")
				c.Routes(
					dogma.HandlesCommand[*CommandStub[TypeA]](),
					dogma.RecordsEvent[*EventStub[TypeA]](),
				)
			},
		}

		entity := runtimeconfig.FromApplication(&ApplicationStub{
			ConfigureFunc: func(c dogma.ApplicationConfigurer) {
				c.Identity("app", "14769f7f-87fe-48dd-916e-5bcab6ba6aca")
				c.Routes(dogma.ViaAggregate(h))
			},
		})

		if got, ok := entity.HandlerByName("name"); ok {
			want := runtimeconfig.FromAggregate(h)

			test.Expect(
				t,
				"unexpected handler",
				got,
				want,
			)
		} else {
			t.Fatal("expected handler to be found")
		}

		if _, ok := entity.HandlerByName("unknown"); ok {
			t.Fatal("did not expect handler to be found")
		}
	})

	t.Run("func RouteSet()", func(t *testing.T) {
		t.Run("it returns the union of the handler's route sets", func(t *testing.T) {
			app := &ApplicationStub{
				ConfigureFunc: func(c dogma.ApplicationConfigurer) {
					c.Identity("app", "04c64a99-2b48-4cd5-a62a-85c6cb1d5e35")
					c.Routes(
						dogma.ViaAggregate(&AggregateMessageHandlerStub[*AggregateRootStub]{
							ConfigureFunc: func(c dogma.AggregateConfigurer) {
								c.Identity("aggregate", "6a006c20-075f-4706-8230-4188b42b60aa")
								c.Routes(
									dogma.HandlesCommand[*CommandStub[TypeA]](),
									dogma.RecordsEvent[*EventStub[TypeA]](),
									dogma.RecordsEvent[*EventStub[TypeB]](),
								)
							},
						}),
						dogma.ViaProcess(&ProcessMessageHandlerStub[*ProcessRootStub]{
							ConfigureFunc: func(c dogma.ProcessConfigurer) {
								c.Identity("process1", "3614c386-4d8d-4a1d-88fa-10f94313c803")
								c.Routes(
									dogma.HandlesEvent[*EventStub[TypeB]](),
									dogma.ExecutesCommand[*CommandStub[TypeB]](),
									dogma.SchedulesDeadline[*DeadlineStub[TypeA]](),
								)
							},
						}),
					)
				},
			}

			entity := runtimeconfig.FromApplication(app)

			test.Expect(
				t,
				"unexpected routes",
				entity.RouteSet().MessageTypes(),
				map[message.Type]RouteDirection{
					message.TypeFor[*CommandStub[TypeA]]():  InboundDirection,
					message.TypeFor[*EventStub[TypeA]]():    OutboundDirection,
					message.TypeFor[*EventStub[TypeB]]():    InboundDirection | OutboundDirection,
					message.TypeFor[*CommandStub[TypeB]]():  OutboundDirection,
					message.TypeFor[*DeadlineStub[TypeA]](): InboundDirection | OutboundDirection,
				},
			)
		})

		t.Run("it panics if the routes are invalid", func(t *testing.T) {
			entity := &Application{
				HandlerComponents: []Handler{
					&Projection{
						HandlerCommon: HandlerCommon{
							RouteComponents: []*Route{
								{},
							},
						},
					},
				},
			}

			test.ExpectPanic(
				t,
				`projection is invalid: route is invalid: route type is unavailable`,
				func() {
					entity.RouteSet()
				},
			)
		})
	})

	t.Run("func Validate()", func(t *testing.T) {
		t.Run("it panics if the source is present but the typename is not", func(t *testing.T) {
			test.ExpectPanic(
				t,
				`malformed configuration representation: there is a problem with the *config.Application value (and not necessarily the configuration it represents): Source is present, but TypeName is not`,
				func() {
					Validate(&Application{
						Source: optional.Some[dogma.Application](
							&ApplicationStub{},
						),
					})
				},
			)
		})
	})
}
