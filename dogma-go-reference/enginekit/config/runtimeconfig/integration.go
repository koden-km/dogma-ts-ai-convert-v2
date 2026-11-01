package runtimeconfig

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/internal/configbuilder"
)

// FromIntegration returns a new [config.Integration] that represents the
// configuration of the given [dogma.IntegrationMessageHandler].
func FromIntegration(h dogma.IntegrationMessageHandler) *config.Integration {
	return configbuilder.Integration(
		func(b *configbuilder.IntegrationBuilder) {
			buildIntegration(b, h)
		},
	)
}

func buildIntegration(b *configbuilder.IntegrationBuilder, h dogma.IntegrationMessageHandler) {
	if h == nil {
		b.Partial()
	} else {
		c := newHandlerConfigurerWithConcurrencyPreference[dogma.IntegrationRoute](b)
		b.Source(h)
		h.Configure(c)
	}
}
