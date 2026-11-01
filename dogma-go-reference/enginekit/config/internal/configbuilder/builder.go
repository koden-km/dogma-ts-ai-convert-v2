package configbuilder

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/internal/typename"
	"github.com/dogmatiq/enginekit/optional"
)

// ComponentBuilder an interface for builders that produce a [config.Component].
type ComponentBuilder[T config.Component] interface {
	Partial()
	Speculative()
	Done() T
}

// EntityBuilder an interface for builders that produce a [config.Entity].
type EntityBuilder[T config.Entity, E any] interface {
	ComponentBuilder[T]

	// TypeName sets the name of the concrete type that implements the
	// entity.
	TypeName(n string)

	// Source sets the source value to h.
	Source(E)

	// Identity calls fn which configures a [config.Identity] that is added to
	// the handler.
	Identity(fn func(*IdentityBuilder))
}

// HandlerBuilder an interface for builders that produce a [config.Handler].
type HandlerBuilder[T config.Handler, H any] interface {
	EntityBuilder[T, H]

	// Route calls fn which configures a [config.Route] that is added to the
	// handler.
	Route(fn func(*RouteBuilder))

	// Disabled calls fn which configures a [config.FlagModification] that is
	// added to the handler's disabled flag.
	Disabled(fn func(*FlagBuilder[config.Disabled]))
}

// HandlerBuilderWithConcurrencyPreference is an interface for builders that
// produce a [config.Handler] that supports configuring a
// [config.ConcurrencyPreference].
type HandlerBuilderWithConcurrencyPreference[T config.Handler, H any] interface {
	HandlerBuilder[T, H]

	// ConcurrencyPreference calls fn which configures a
	// [config.ConcurrencyPreference] that is added to the handler.
	ConcurrencyPreference(fn func(*ConcurrencyPreferenceBuilder))
}

var (
	_ ComponentBuilder[*config.Identity]              = (*IdentityBuilder)(nil)
	_ ComponentBuilder[*config.Flag[config.Disabled]] = (*FlagBuilder[config.Disabled])(nil)

	_ EntityBuilder[*config.Application, dogma.Application] = (*ApplicationBuilder)(nil)

	_ HandlerBuilder[*config.Aggregate, dogma.AggregateMessageHandler[dogma.AggregateRoot]]         = (*AggregateBuilder)(nil)
	_ HandlerBuilder[*config.Process, dogma.ProcessMessageHandler[dogma.ProcessRoot]]               = (*ProcessBuilder)(nil)
	_ HandlerBuilderWithConcurrencyPreference[*config.Integration, dogma.IntegrationMessageHandler] = (*IntegrationBuilder)(nil)
	_ HandlerBuilderWithConcurrencyPreference[*config.Projection, dogma.ProjectionMessageHandler]   = (*ProjectionBuilder)(nil)

	_ ComponentBuilder[*config.Route] = (*RouteBuilder)(nil)
)

func setTypeName[T any](
	typeName *optional.Optional[string],
	source *optional.Optional[T],
	n string,
) {
	if n == "" {
		panic("concrete type name must not be empty")
	}

	*typeName = optional.Some(n)
	*source = optional.None[T]()
}

func setSource[T any](
	typeName *optional.Optional[string],
	source *optional.Optional[T],
	v T,
) {
	if any(v) == nil {
		panic("source must not be nil")
	}

	unwrapped := dogma.UnwrapHandler(v)
	*typeName = optional.Some(typename.Of(unwrapped))
	*source = optional.Some(v)
}
