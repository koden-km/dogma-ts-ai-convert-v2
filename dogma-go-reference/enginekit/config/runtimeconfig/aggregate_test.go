package runtimeconfig_test

import (
	"testing"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	. "github.com/dogmatiq/enginekit/config/runtimeconfig"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	. "github.com/dogmatiq/enginekit/internal/test"
	"github.com/dogmatiq/enginekit/message"
	"github.com/dogmatiq/enginekit/optional"
)

func TestFromAggregate(t *testing.T) {
	cases := []struct {
		Name    string
		Handler dogma.AggregateMessageHandler[dogma.AggregateRoot]
		Want    func(h dogma.AggregateMessageHandler[dogma.AggregateRoot]) *config.Aggregate
	}{
		{
			"nil handler",
			nil,
			func(dogma.AggregateMessageHandler[dogma.AggregateRoot]) *config.Aggregate {
				return &config.Aggregate{
					HandlerCommon: config.HandlerCommon{
						EntityCommon: config.EntityCommon{
							ComponentCommon: config.ComponentCommon{
								IsPartial: true,
							},
						},
					},
				}
			},
		},
		{
			"unconfigured handler",
			dogma.UntypedAggregateMessageHandler(&AggregateMessageHandlerStub[*AggregateRootStub]{}),
			func(h dogma.AggregateMessageHandler[dogma.AggregateRoot]) *config.Aggregate {
				return &config.Aggregate{
					HandlerCommon: config.HandlerCommon{
						EntityCommon: config.EntityCommon{
							TypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.AggregateMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.AggregateRootStub]"),
						},
					},
					Source: optional.Some(h),
				}
			},
		},
		{
			"configured handler",
			dogma.UntypedAggregateMessageHandler(&AggregateMessageHandlerStub[*AggregateRootStub]{
				ConfigureFunc: func(c dogma.AggregateConfigurer) {
					c.Identity("aggregate", "d9d75a75-7839-4b3e-a7e5-c8884b88ea57")
					c.Routes(
						dogma.HandlesCommand[*CommandStub[TypeA]](),
						dogma.RecordsEvent[*EventStub[TypeA]](),
					)
					c.Disable()
				},
			}),
			func(h dogma.AggregateMessageHandler[dogma.AggregateRoot]) *config.Aggregate {
				return &config.Aggregate{
					HandlerCommon: config.HandlerCommon{
						EntityCommon: config.EntityCommon{
							TypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.AggregateMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.AggregateRootStub]"),
							IdentityComponents: []*config.Identity{
								{
									Name: optional.Some("aggregate"),
									Key:  optional.Some("d9d75a75-7839-4b3e-a7e5-c8884b88ea57"),
								},
							},
						},
						RouteComponents: []*config.Route{
							{
								RouteType:       optional.Some(config.HandlesCommandRouteType),
								MessageTypeID:   optional.Some(MessageTypeID[*CommandStub[TypeA]]()),
								MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
								MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
							},
							{
								RouteType:       optional.Some(config.RecordsEventRouteType),
								MessageTypeID:   optional.Some(MessageTypeID[*EventStub[TypeA]]()),
								MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
								MessageType:     optional.Some(message.TypeFor[*EventStub[TypeA]]()),
							},
						},
						DisabledFlags: []*config.Flag[config.Disabled]{
							{Value: optional.Some(true)},
						},
					},
					Source: optional.Some(h),
				}
			},
		},
	}

	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			Expect(
				t,
				"unexpected config",
				FromAggregate(c.Handler),
				c.Want(c.Handler),
			)
		})
	}
}
