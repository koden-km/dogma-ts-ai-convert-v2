package message

import (
	"fmt"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/internal/enum"
)

// SwitchByKind invokes one of the provided functions based on k.
//
// It provides a compile-time guarantee that all possible values are handled,
// even if new [Kind] values are added in the future.
//
// It panics if the function associated with k is nil, or if k is not a valid
// [Kind].
func SwitchByKind(
	k Kind,
	command func(),
	event func(),
	deadline func(),
) {
	enum.Switch(k, command, event, deadline)
}

// MapByKind maps k to a value of type T.
//
// It provides a compile-time guarantee that all possible values are handled,
// even if new [Kind] values are added in the future.
//
// It panics if k is not a valid [Kind].
func MapByKind[T any](k Kind, command, event, deadline T) T {
	return enum.Map(k, command, event, deadline)
}

// SwitchByKindOf invokes one of the provided functions based on the [Kind] of m.
//
// It provides a compile-time guarantee that all kinds are handled, even if new
// [Kind] values are added in the future.
//
// It panics if the function associated with m's kind is nil, or if m does not
// implement [dogma.Command], [dogma.Event] or [dogma.Deadline].
func SwitchByKindOf(
	m dogma.Message,
	command func(dogma.Command),
	event func(dogma.Event),
	deadline func(dogma.Deadline),
) {
	switch m := m.(type) {
	case dogma.Command:
		if command == nil {
			panic("no case function was provided for dogma.Command")
		}
		command(m)
	case dogma.Event:
		if event == nil {
			panic("no case function was provided for dogma.Event")
		}
		event(m)
	case dogma.Deadline:
		if deadline == nil {
			panic("no case function was provided for dogma.Deadline")
		}
		deadline(m)
	default:
		panic(fmt.Sprintf(
			"%T implements dogma.Message, but does not implement dogma.Command, dogma.Event or dogma.Deadline",
			m,
		))
	}
}

// MapByKindOf invokes one of the provided functions based on the [Kind] of m, and
// returns the result.
//
// It provides a compile-time guarantee that all kinds are handled, even if new
// [Kind] values are added in the future.
//
// It panics if the function associated with m's kind is nil, or if m does not
// implement [dogma.Command], [dogma.Event] or [dogma.Deadline].
func MapByKindOf[T any](
	m dogma.Message,
	command func(dogma.Command) T,
	event func(dogma.Event) T,
	deadline func(dogma.Deadline) T,
) (result T) {
	SwitchByKindOf(
		m,
		enum.AssignResult(command, &result),
		enum.AssignResult(event, &result),
		enum.AssignResult(deadline, &result),
	)

	return result
}

// MapByKindOfWithErr invokes one of the provided functions based on the [Kind] of m,
// and returns the result and error value.
//
// It provides a compile-time guarantee that all kinds are handled, even if new
// [Kind] values are added in the future.
//
// It panics if the function associated with m's kind is nil, or if m does not
// implement [dogma.Command], [dogma.Event] or [dogma.Deadline].
func MapByKindOfWithErr[T any](
	m dogma.Message,
	command func(dogma.Command) (T, error),
	event func(dogma.Event) (T, error),
	deadline func(dogma.Deadline) (T, error),
) (result T, err error) {
	SwitchByKindOf(
		m,
		enum.AssignResultErr(command, &result, &err),
		enum.AssignResultErr(event, &result, &err),
		enum.AssignResultErr(deadline, &result, &err),
	)

	return result, err
}
