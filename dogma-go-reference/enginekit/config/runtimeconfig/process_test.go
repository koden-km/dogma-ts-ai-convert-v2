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

func TestFromProcess(t *testing.T) {
	cases := []struct {
		Name    string
		Handler dogma.ProcessMessageHandler[dogma.ProcessRoot]
		Want    func(h dogma.ProcessMessageHandler[dogma.ProcessRoot]) *config.Process
	}{
		{
			"nil handler",
			nil,
			func(dogma.ProcessMessageHandler[dogma.ProcessRoot]) *config.Process {
				return &config.Process{
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
			dogma.UntypedProcessMessageHandler(&ProcessMessageHandlerStub[*ProcessRootStub]{}),
			func(h dogma.ProcessMessageHandler[dogma.ProcessRoot]) *config.Process {
				return &config.Process{
					HandlerCommon: config.HandlerCommon{
						EntityCommon: config.EntityCommon{
							TypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.ProcessMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.ProcessRootStub]"),
						},
					},
					Source: optional.Some(h),
				}
			},
		},
		{
			"configured handler",
			dogma.UntypedProcessMessageHandler(&ProcessMessageHandlerStub[*ProcessRootStub]{
				ConfigureFunc: func(c dogma.ProcessConfigurer) {
					c.Identity("projection", "050415ad-ce90-496f-8987-40467e5415e0")
					c.Routes(
						dogma.HandlesEvent[*EventStub[TypeA]](),
						dogma.ExecutesCommand[*CommandStub[TypeA]](),
						dogma.SchedulesDeadline[*DeadlineStub[TypeA]](),
					)
					c.Disable()
				},
			}),
			func(h dogma.ProcessMessageHandler[dogma.ProcessRoot]) *config.Process {
				return &config.Process{
					HandlerCommon: config.HandlerCommon{
						EntityCommon: config.EntityCommon{
							TypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.ProcessMessageHandlerStub[*github.com/dogmatiq/enginekit/enginetest/stubs.ProcessRootStub]"),
							IdentityComponents: []*config.Identity{
								{
									Name: optional.Some("projection"),
									Key:  optional.Some("050415ad-ce90-496f-8987-40467e5415e0"),
								},
							},
						},
						RouteComponents: []*config.Route{
							{
								RouteType:       optional.Some(config.HandlesEventRouteType),
								MessageTypeID:   optional.Some(MessageTypeID[*EventStub[TypeA]]()),
								MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
								MessageType:     optional.Some(message.TypeFor[*EventStub[TypeA]]()),
							},
							{
								RouteType:       optional.Some(config.ExecutesCommandRouteType),
								MessageTypeID:   optional.Some(MessageTypeID[*CommandStub[TypeA]]()),
								MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
								MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
							},
							{
								RouteType:       optional.Some(config.SchedulesDeadlineRouteType),
								MessageTypeID:   optional.Some(MessageTypeID[*DeadlineStub[TypeA]]()),
								MessageTypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.DeadlineStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]"),
								MessageType:     optional.Some(message.TypeFor[*DeadlineStub[TypeA]]()),
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
				FromProcess(c.Handler),
				c.Want(c.Handler),
			)
		})
	}
}
