package constraints

import "github.com/dogmatiq/dogma"

// Configurer is the common interface for the Dogma configurer interfaces that
// are passed to the [Entity.Configure] method.
//
//   - [dogma.ApplicationConfigurer]
//   - [dogma.AggregateConfigurer]
//   - [dogma.ProcessConfigurer]
//   - [dogma.IntegrationConfigurer]
//   - [dogma.ProjectionConfigurer]
type Configurer interface {
	Identity(name, key string)
}

// Entity is the common interface for the Dogma interfaces that represent an
// entity within a Dogma configuration; that is, types that are configured by
// implementing a Configure() method.
//
//   - [dogma.Application]
//   - [dogma.Aggregate]
//   - [dogma.Process]
//   - [dogma.Integration]
//   - [dogma.Projection]
type Entity[C Configurer] interface {
	Configure(C)
}

// Handler is an [Entity] that represents a Dogma handler.
type Handler[C HandlerConfigurer[R], R dogma.MessageRoute] interface {
	Entity[C]
}

// HandlerConfigurer is a [Configurer] for configuring [Handler] entities.
type HandlerConfigurer[R dogma.MessageRoute] interface {
	dogma.HandlerConfigurer
	Routes(...R)
}
