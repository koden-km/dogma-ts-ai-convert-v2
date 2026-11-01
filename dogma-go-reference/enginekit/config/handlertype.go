package config

import (
	"iter"

	"github.com/dogmatiq/enginekit/internal/enum"
)

// HandlerType is an enumeration of the types of message handlers.
type HandlerType int

const (
	// AggregateHandlerType is the [HandlerType] for implementations of
	// [dogma.AggregateMessageHandler].
	AggregateHandlerType HandlerType = iota

	// ProcessHandlerType is the [HandlerType] for implementations of
	// [dogma.ProcessMessageHandler].
	ProcessHandlerType

	// IntegrationHandlerType is the [HandlerType] for implementations of
	// [dogma.IntegrationMessageHandler].
	IntegrationHandlerType

	// ProjectionHandlerType is the [HandlerType] for implementations of
	// [dogma.ProjectionMessageHandler].
	ProjectionHandlerType
)

// HandlerTypes returns a sequence that yields all valid [HandlerType] values.
func HandlerTypes() iter.Seq[HandlerType] {
	return enum.Range(AggregateHandlerType, ProjectionHandlerType)
}

func (t HandlerType) String() string {
	return enum.String(
		t,
		"aggregate",
		"process",
		"integration",
		"projection",
	)
}

// RouteCapabilities returns a value that describes the routing capabilities of
// the handler type.
func (t HandlerType) RouteCapabilities() RouteCapabilities {
	return RouteCapabilities{
		MapByHandlerType(
			t,
			map[RouteType]RouteCapability{
				HandlesCommandRouteType: RouteTypeRequired,
				RecordsEventRouteType:   RouteTypeRequired,
			},
			map[RouteType]RouteCapability{
				HandlesEventRouteType:      RouteTypeRequired,
				ExecutesCommandRouteType:   RouteTypeRequired,
				SchedulesDeadlineRouteType: RouteTypeAllowed,
			},
			map[RouteType]RouteCapability{
				HandlesCommandRouteType: RouteTypeRequired,
				RecordsEventRouteType:   RouteTypeAllowed,
			},
			map[RouteType]RouteCapability{
				HandlesEventRouteType: RouteTypeRequired,
			},
		),
	}
}

// SwitchByHandlerType invokes one of the provided functions based on t.
//
// It provides a compile-time guarantee that all possible values are handled,
// even if new [HandlerType] values are added in the future.
//
// It panics if the function associated with t is nil, or if t is not a valid
// [HandlerType].
func SwitchByHandlerType(
	t HandlerType,
	aggregate func(),
	process func(),
	integration func(),
	projection func(),
) {
	enum.Switch(
		t,
		aggregate,
		process,
		integration,
		projection,
	)
}

// MapByHandlerType maps t to a value of type T.
//
// It provides a compile-time guarantee that all possible values are handled,
// even if new [HandlerType] values are added in the future.
//
// It panics if t is not a valid [HandlerType].
func MapByHandlerType[T any](
	t HandlerType,
	aggregate T,
	process T,
	integration T,
	projection T,
) T {
	return enum.Map(
		t,
		aggregate,
		process,
		integration,
		projection,
	)
}

// SwitchByHandlerTypeOf invokes one of the provided functions based on the
// [HandlerType] of h.
//
// It provides a compile-time guarantee that all types are handled, even if new
// [HandlerType] values are added in the future.
//
// It panics if the function associated with h's type is nil.
func SwitchByHandlerTypeOf(
	h Handler,
	aggregate func(*Aggregate),
	process func(*Process),
	integration func(*Integration),
	projection func(*Projection),
) {
	switch h := h.(type) {
	case *Aggregate:
		if aggregate == nil {
			panic("no case function was provided for *config.Aggregate")
		}
		aggregate(h)
	case *Process:
		if process == nil {
			panic("no case function was provided for *config.Process")
		}
		process(h)
	case *Integration:
		if integration == nil {
			panic("no case function was provided for *config.Integration")
		}
		integration(h)
	case *Projection:
		if projection == nil {
			panic("no case function was provided for *config.Projection")
		}
		projection(h)
	default:
		panic("invalid handler type")
	}
}

// MapByHandlerTypeOf invokes one of the provided functions based on the
// [HandlerType] of h, and returns the result.
//
// It provides a compile-time guarantee that all types are handled, even if new
// [HandlerType] values are added in the future.
//
// It panics if the function associated with h's type is nil.
func MapByHandlerTypeOf[T any](
	h Handler,
	aggregate func(*Aggregate) T,
	process func(*Process) T,
	integration func(*Integration) T,
	projection func(*Projection) T,
) (result T) {
	SwitchByHandlerTypeOf(
		h,
		enum.AssignResult(aggregate, &result),
		enum.AssignResult(process, &result),
		enum.AssignResult(integration, &result),
		enum.AssignResult(projection, &result),
	)

	return result
}

// MapByHandlerTypeOfWithErr invokes one of the provided functions based on the
// [HandlerType] of h, and returns the result and error value.
//
// It provides a compile-time guarantee that all types are handled, even if new
// [HandlerType] values are added in the future.
//
// It panics if the function associated with h's type is nil.
func MapByHandlerTypeOfWithErr[T any](
	h Handler,
	aggregate func(*Aggregate) (T, error),
	process func(*Process) (T, error),
	integration func(*Integration) (T, error),
	projection func(*Projection) (T, error),
) (result T, err error) {
	SwitchByHandlerTypeOf(
		h,
		enum.AssignResultErr(aggregate, &result, &err),
		enum.AssignResultErr(process, &result, &err),
		enum.AssignResultErr(integration, &result, &err),
		enum.AssignResultErr(projection, &result, &err),
	)

	return result, err
}
