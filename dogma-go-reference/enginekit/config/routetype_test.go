package config_test

import (
	"cmp"
	"slices"
	"testing"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/collections/sets"
	. "github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/runtimeconfig"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	"github.com/dogmatiq/enginekit/internal/test"
	"github.com/dogmatiq/enginekit/message"
)

func TestRouteType(t *testing.T) {
	test.Enum(
		t,
		test.EnumSpec[RouteType]{
			Range:       RouteTypes,
			Switch:      SwitchByRouteType,
			MapToString: MapByRouteType[string],
		},
	)
}

func TestRouteSet(t *testing.T) {
	t.Run("func MessageTypeSet()", func(t *testing.T) {
		t.Run("it returns the message types in the route set", func(t *testing.T) {
			h := &AggregateMessageHandlerStub[*AggregateRootStub]{
				ConfigureFunc: func(c dogma.AggregateConfigurer) {
					c.Identity("name", "19cb98d5-dd17-4daf-ae00-1b413b7b899a")
					c.Routes(
						dogma.HandlesCommand[*CommandStub[TypeA]](),
						dogma.RecordsEvent[*EventStub[TypeA]](),
					)
				},
			}

			handler := runtimeconfig.FromAggregate(h)

			sort := func(a, b message.Type) int {
				return cmp.Compare(a.Name(), b.Name())
			}

			got := slices.SortedFunc(
				handler.
					RouteSet().
					MessageTypeSet().
					All(),
				sort,
			)

			want := slices.SortedFunc(
				sets.
					New(
						message.TypeFor[*CommandStub[TypeA]](),
						message.TypeFor[*EventStub[TypeA]](),
					).
					All(),
				sort,
			)

			test.Expect(
				t,
				"unexpected routes",
				got,
				want,
			)
		})
	})
}
