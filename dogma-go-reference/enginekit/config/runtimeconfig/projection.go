package runtimeconfig

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/internal/configbuilder"
)

// FromProjection returns a new [config.Projection] that represents the
// configuration of the given [dogma.ProjectionMessageHandler].
func FromProjection(h dogma.ProjectionMessageHandler) *config.Projection {
	return configbuilder.Projection(func(b *configbuilder.ProjectionBuilder) {
		buildProjection(b, h)
	})
}

func buildProjection(b *configbuilder.ProjectionBuilder, h dogma.ProjectionMessageHandler) {
	if h == nil {
		b.Partial()
	} else {
		c := newHandlerConfigurerWithConcurrencyPreference[dogma.ProjectionRoute](b)
		b.Source(h)
		h.Configure(c)
	}
}
