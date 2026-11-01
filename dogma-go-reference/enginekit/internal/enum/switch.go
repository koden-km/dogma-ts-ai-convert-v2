package enum

import "fmt"

// Switch calls a function associated with an enum value.
func Switch[E Enum](
	v E,
	cases ...func(),
) {
	fn := Map(v, cases...)

	if fn == nil {
		panic(fmt.Sprintf("no case function was provided for %q", v))
	}

	fn()
}

// Map maps an enum value to a value of type T.
func Map[E Enum, T any](
	v E,
	cases ...T,
) T {
	if result, ok := try(v, cases...); ok {
		return result
	}
	panic(fmt.Sprintf("invalid %T (%d)", v, v))
}

// String is a convenience method for implementing [fmt.Stringer]. It is similar
// to [Map], but does not panic if the enum value is invalid, and does not
// recurse into v.String().
func String[E Enum](
	v E,
	cases ...string,
) string {
	if result, ok := try(v, cases...); ok {
		return result
	}
	return fmt.Sprintf("invalid(%d)", v)
}

func try[E Enum, T any](
	v E,
	cases ...T,
) (T, bool) {
	if v < 0 || int(v) >= len(cases) {
		var zero T
		return zero, false
	}

	return cases[v], true
}
