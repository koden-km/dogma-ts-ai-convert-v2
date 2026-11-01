package config

import (
	"iter"

	"github.com/dogmatiq/enginekit/internal/enum"
	"github.com/dogmatiq/enginekit/message"
)

// RouteType is an enumeration of the types of message routes that can be
// configured on a [Handler].
type RouteType int

const (
	// HandlesCommandRouteType is a [RouteType] that indicates a [Handler]
	// handles a specific type of [dogma.Command] message.
	//
	// It is associated with routes configured by [dogma.HandlesCommand].
	HandlesCommandRouteType RouteType = iota

	// HandlesEventRouteType is a [RouteType] that indicates a [Handler] handles
	// a specific type of [dogma.Event] message.
	//
	// It is associated with routes configured by [dogma.HandlesEvent].
	HandlesEventRouteType

	// ExecutesCommandRouteType is a [RouteType] that indicates a [Handler]
	// executes a specific type of [dogma.Command] message.
	//
	// It is associated with routes configured by [dogma.ExecutesCommand].
	ExecutesCommandRouteType

	// RecordsEventRouteType is a [RouteType] that indicates a [Handler] records
	// a specific type of [dogma.Event] message.
	//
	// It is associated with routes configured by [dogma.RecordsEvent].
	RecordsEventRouteType

	// SchedulesDeadlineRouteType is a [RouteType] that indicates a [Handler]
	// schedules a specific type of [dogma.Deadline] message.
	//
	// It is associated with routes configured by [dogma.SchedulesDeadline].
	SchedulesDeadlineRouteType
)

// RouteTypes returns a list of all [RouteType] values.
func RouteTypes() iter.Seq[RouteType] {
	return enum.Range(HandlesCommandRouteType, SchedulesDeadlineRouteType)
}

// Direction returns the direction in which messages flow for the route type.
func (r RouteType) Direction() RouteDirection {
	return MapByRouteType(
		r,
		InboundDirection,
		InboundDirection,
		OutboundDirection,
		OutboundDirection,
		InboundDirection|OutboundDirection,
	)
}

// MessageKind returns the kind of message that the route type is associated with.
func (r RouteType) MessageKind() message.Kind {
	return MapByRouteType(
		r,
		message.CommandKind,
		message.EventKind,
		message.CommandKind,
		message.EventKind,
		message.DeadlineKind,
	)
}

func (r RouteType) String() string {
	return enum.String(
		r,
		"handles-command",
		"handles-event",
		"executes-command",
		"records-event",
		"schedules-deadline",
	)
}

// SwitchByRouteType invokes one of the provided functions based on t.
//
// It provides a compile-time guarantee that all possible values are handled,
// even if new [RouteType] values are added in the future.
//
// It panics if the function associated with t is nil, or if t is not a valid
// [RouteType].
func SwitchByRouteType(
	t RouteType,
	handlesCommand func(),
	handlesEvent func(),
	executesCommand func(),
	recordsEvent func(),
	schedulesDeadline func(),
) {
	enum.Switch(
		t,
		handlesCommand,
		handlesEvent,
		executesCommand,
		recordsEvent,
		schedulesDeadline,
	)
}

// MapByRouteType maps t to a value of type T.
//
// It provides a compile-time guarantee that all possible values are handled,
// even if new [RouteType] values are added in the future.
//
// It panics if t is not a valid [RouteType].
func MapByRouteType[T any](
	t RouteType,
	handlesCommand T,
	handlesEvent T,
	executesCommand T,
	recordsEvent T,
	schedulesDeadline T,
) T {
	return enum.Map(
		t,
		handlesCommand,
		handlesEvent,
		executesCommand,
		recordsEvent,
		schedulesDeadline,
	)
}
