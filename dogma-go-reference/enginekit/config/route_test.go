package config_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/config"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	"github.com/dogmatiq/enginekit/internal/typename"
	"github.com/dogmatiq/enginekit/message"
	"github.com/dogmatiq/enginekit/optional"
)

func TestRoute(t *testing.T) {
	testDescribe(
		t,
		describeTestCases{
			{
				Name:        "handles command",
				String:      `route:handles-command:CommandStub[TypeA]`,
				Description: `valid handles-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: &Route{
					RouteType:       optional.Some(HandlesCommandRouteType),
					MessageTypeName: optional.Some(typename.For[*CommandStub[TypeA]]()),
					MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
				},
			},
			{
				Name:        "handles event",
				String:      `route:handles-event:EventStub[TypeA]`,
				Description: `valid handles-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: &Route{
					RouteType:       optional.Some(HandlesEventRouteType),
					MessageTypeName: optional.Some(typename.For[*EventStub[TypeA]]()),
					MessageType:     optional.Some(message.TypeFor[*EventStub[TypeA]]()),
				},
			},
			{
				Name:        "executes command",
				String:      `route:executes-command:CommandStub[TypeA]`,
				Description: `valid executes-command route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: &Route{
					RouteType:       optional.Some(ExecutesCommandRouteType),
					MessageTypeName: optional.Some(typename.For[*CommandStub[TypeA]]()),
					MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
				},
			},
			{
				Name:        "records event",
				String:      `route:records-event:EventStub[TypeA]`,
				Description: `valid records-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.EventStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: &Route{
					RouteType:       optional.Some(RecordsEventRouteType),
					MessageTypeName: optional.Some(typename.For[*EventStub[TypeA]]()),
					MessageType:     optional.Some(message.TypeFor[*EventStub[TypeA]]()),
				},
			},
			{
				Name:        "schedules deadline",
				String:      `route:schedules-deadline:DeadlineStub[TypeA]`,
				Description: `valid schedules-deadline route for *github.com/dogmatiq/enginekit/enginetest/stubs.DeadlineStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
				Component: &Route{
					RouteType:       optional.Some(SchedulesDeadlineRouteType),
					MessageTypeName: optional.Some(typename.For[*DeadlineStub[TypeA]]()),
					MessageType:     optional.Some(message.TypeFor[*DeadlineStub[TypeA]]()),
				},
			},
			{
				Name:        "no runtime values",
				String:      `route:handles-command:SomeCommand`,
				Description: `valid handles-command route for pkg.SomeCommand (type unavailable)`,
				Component: &Route{
					RouteType:       optional.Some(HandlesCommandRouteType),
					MessageTypeName: optional.Some("pkg.SomeCommand"),
				},
			},
			{
				Name:   "empty",
				String: `route`,
				Description: multiline(
					`incomplete route`,
					`  - route type is unavailable`,
					`  - message type name is unavailable`,
				),
				Component: &Route{},
			},
			{
				Name:   "missing route type",
				String: `route:CommandStub[TypeA]`,
				Description: multiline(
					`incomplete route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - route type is unavailable`,
				),
				Component: &Route{
					MessageTypeName: optional.Some(typename.For[*CommandStub[TypeA]]()),
					MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
				},
			},
			{
				Name:   "missing message type name",
				String: `route:handles-command`,
				Description: multiline(
					`incomplete handles-command route`,
					`  - message type name is unavailable`,
				),
				Component: &Route{
					RouteType: optional.Some(HandlesCommandRouteType),
				},
			},
			{
				Name:   "mismatched message kind",
				String: `route:handles-event:CommandStub[TypeA]`,
				Description: multiline(
					`invalid handles-event route for *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]`,
					`  - unexpected message kind: *github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA] is a command, expected an event`,
				),
				Component: &Route{
					RouteType:       optional.Some(HandlesEventRouteType),
					MessageTypeName: optional.Some(typename.For[*CommandStub[TypeA]]()),
					MessageType:     optional.Some(message.TypeFor[*CommandStub[TypeA]]()),
				},
			},
		},
	)
}
