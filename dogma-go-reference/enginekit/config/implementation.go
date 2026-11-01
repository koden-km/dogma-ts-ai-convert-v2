package config

import (
	"context"

	"github.com/dogmatiq/dogma"
)

// UntypedAggregateMessageHandler is a subset of
// [dogma.AggregateMessageHandler] that includes only the methods that do not
// depend on the type parameter R.
type UntypedAggregateMessageHandler interface {
	Configure(dogma.AggregateConfigurer)
	RouteCommandToInstance(dogma.Command) string
}

// UntypedProcessMessageHandler is a subset of [dogma.ProcessMessageHandler]
// that includes only the methods that do not depend on the type parameter R.
type UntypedProcessMessageHandler interface {
	Configure(dogma.ProcessConfigurer)
	RouteEventToInstance(context.Context, dogma.Event) (string, bool, error)
}
