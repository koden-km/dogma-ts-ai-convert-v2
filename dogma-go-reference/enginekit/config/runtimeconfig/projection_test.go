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

func TestFromProjection(t *testing.T) {
	cases := []struct {
		Name    string
		Handler dogma.ProjectionMessageHandler
		Want    func(h dogma.ProjectionMessageHandler) *config.Projection
	}{
		{
			"nil handler",
			nil,
			func(dogma.ProjectionMessageHandler) *config.Projection {
				return &config.Projection{
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
			&ProjectionMessageHandlerStub{},
			func(h dogma.ProjectionMessageHandler) *config.Projection {
				return &config.Projection{
					HandlerCommon: config.HandlerCommon{
						EntityCommon: config.EntityCommon{
							TypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.ProjectionMessageHandlerStub"),
						},
					},
					Source: optional.Some(h),
				}
			},
		},
		{
			"configured handler",
			&ProjectionMessageHandlerStub{
				ConfigureFunc: func(c dogma.ProjectionConfigurer) {
					c.Identity("projection", "050415ad-ce90-496f-8987-40467e5415e0")
					c.Routes(
						dogma.HandlesEvent[*EventStub[TypeA]](),
					)
					c.ConcurrencyPreference(dogma.MinimizeConcurrency)
					c.Disable()
				},
			},
			func(h dogma.ProjectionMessageHandler) *config.Projection {
				return &config.Projection{
					HandlerCommon: config.HandlerCommon{
						EntityCommon: config.EntityCommon{
							TypeName: optional.Some("*github.com/dogmatiq/enginekit/enginetest/stubs.ProjectionMessageHandlerStub"),
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
						},
						DisabledFlags: []*config.Flag[config.Disabled]{
							{Value: optional.Some(true)},
						},
					},
					Source: optional.Some(h),
					ConcurrencyPreferences: []*config.ConcurrencyPreference{
						{Value: optional.Some(dogma.MinimizeConcurrency)},
					},
				}
			},
		},
	}

	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			Expect(
				t,
				"unexpected config",
				FromProjection(c.Handler),
				c.Want(c.Handler),
			)
		})
	}
}
