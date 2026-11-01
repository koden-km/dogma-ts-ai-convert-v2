package runtimeconfig

import (
	"fmt"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/internal/configbuilder"
)

// FromApplication returns a new [config.Application] that represents the
// configuration of the given [dogma.Application].
func FromApplication(app dogma.Application) *config.Application {
	return configbuilder.Application(
		func(b *configbuilder.ApplicationBuilder) {
			if app == nil {
				b.Partial()
			} else {
				b.Source(app)
				app.Configure(&applicationConfigurer{b})
			}
		},
	)
}

type applicationConfigurer struct {
	b *configbuilder.ApplicationBuilder
}

func (c *applicationConfigurer) Identity(name, key string) {
	c.b.Identity(func(b *configbuilder.IdentityBuilder) {
		b.Name(name)
		b.Key(key)
	})
}

func (c *applicationConfigurer) Routes(routes ...dogma.HandlerRoute) {
	for _, r := range routes {
		switch r := r.(type) {
		case dogma.AggregateHandlerRoute:
			c.b.Aggregate(func(b *configbuilder.AggregateBuilder) {
				buildAggregate(b, r.Handler())
			})

		case dogma.ProcessHandlerRoute:
			c.b.Process(func(b *configbuilder.ProcessBuilder) {
				buildProcess(b, r.Handler())
			})

		case dogma.IntegrationHandlerRoute:
			c.b.Integration(func(b *configbuilder.IntegrationBuilder) {
				buildIntegration(b, r.Handler())
			})

		case dogma.ProjectionHandlerRoute:
			c.b.Projection(func(b *configbuilder.ProjectionBuilder) {
				buildProjection(b, r.Handler())
			})

		default:
			panic(fmt.Sprintf("unsupported route type: %T", r))
		}
	}
}
