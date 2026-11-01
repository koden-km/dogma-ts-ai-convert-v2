package optional

import (
	"fmt"
)

// Optional represents an optional value of type T.
type Optional[T any] struct {
	value T
	ok    bool
}

// Some returns an Optional[T] that contains the given value.
func Some[T any](v T) Optional[T] {
	return Optional[T]{v, true}
}

// None returns an Optional[T] that does not contain a value.
func None[T any]() Optional[T] {
	return Optional[T]{}
}

// IsPresent returns true if the optional value is present.
func (o Optional[T]) IsPresent() bool {
	return o.ok
}

// Get returns the optional value, or panics if it is not present.
func (o Optional[T]) Get() T {
	if o.ok {
		return o.value
	}
	panic("value is not present")
}

// TryGet returns the optional value and a boolean indicating whether it is
// present.
func (o Optional[T]) TryGet() (T, bool) {
	return o.value, o.ok
}

// Format implements [fmt.Formatter].
func (o Optional[T]) Format(state fmt.State, verb rune) {
	// If we've been asked for the Go syntax we render it as a call to [Some] or
	// [None].
	if verb == 'v' && state.Flag('#') {
		fmt.Fprintf(
			state,
			fmt.FormatString(state, 's'),
			o.goFormat(),
		)
		return
	}

	spec := fmt.FormatString(state, verb)

	// If we have a value, or we've been asked to render anything other than a
	// string representation then we can just render the interval value. Hence,
	// absent values are rendered as the zero-value of T.
	if o.ok || verb != 's' {
		fmt.Fprintf(state, spec, o.value)
		return
	}

	// We're rendering a plain string representation of an absent value. We
	// render it as a call to [None], then format THAT string according to the
	// format specifier so that any padding, etc is applied.
	fmt.Fprintf(
		state,
		spec,
		o.goFormat(),
	)
}

func (o Optional[T]) goFormat() string {
	spec := "optional.Some(%#v)"
	if !o.ok {
		spec = "optional.None[%T]()"
	}
	return fmt.Sprintf(spec, o.value)
}
