package runtimeconfig

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/internal/configbuilder"
)

// FromAggregate returns a new [config.Aggregate] that represents the
// configuration of the given [dogma.AggregateMessageHandler].
func FromAggregate[R dogma.AggregateRoot](h dogma.AggregateMessageHandler[R]) *config.Aggregate {
	return configbuilder.Aggregate(
		func(b *configbuilder.AggregateBuilder) {
			buildAggregate(b, h)
		},
	)
}

func buildAggregate[R dogma.AggregateRoot](b *configbuilder.AggregateBuilder, h dogma.AggregateMessageHandler[R]) {
	if h == nil {
		b.Partial()
	} else {
		x := dogma.UntypedAggregateMessageHandler(h)
		c := newHandlerConfigurer[dogma.AggregateRoute](b)
		b.Source(x)
		x.Configure(c)
	}
}
