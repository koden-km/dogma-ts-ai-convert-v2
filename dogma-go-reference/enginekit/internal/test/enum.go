package test

import (
	"fmt"
	"iter"
	"reflect"
	"slices"
	"testing"

	"github.com/dogmatiq/enginekit/internal/enum"
)

// EnumSpec is a set of parameters for testing enumeration types.
type EnumSpec[E enum.Enum] struct {
	Range       func() iter.Seq[E]
	Switch      any // func(E, ...func())
	MapToString any // func(E, ...func() string)
}

func (p EnumSpec[E]) cardinality() int {
	values := slices.Collect(p.Range())
	return len(values)
}

func (p EnumSpec[E]) begin() (v E) {
	for v = range p.Range() {
		break
	}
	return v
}

func (p EnumSpec[E]) end() (v E) {
	for v = range p.Range() {
		continue
	}
	return v
}

// Enum is a helper for testing enumeration types.
func Enum[E enum.Enum](t *testing.T, spec EnumSpec[E]) {
	t.Run("range", func(t *testing.T) { enumRange(t, spec) })
	t.Run("switch", func(t *testing.T) { enumSwitch(t, spec) })
	t.Run("map", func(t *testing.T) { enumMap(t, spec) })
}

func enumRange[E enum.Enum](t *testing.T, spec EnumSpec[E]) {
	var want E
	empty := true

	for got := range spec.Range() {
		empty = false
		if want != got {
			t.Fatalf("unexpected value in range: got %d (%s), want %d (%s)", got, got, want, want)
		}
		want++
	}

	if empty {
		t.Fatalf("range function did not yield any values")
	}
}

func enumSwitch[E enum.Enum](t *testing.T, spec EnumSpec[E]) {
	fn := reflect.ValueOf(spec.Switch)

	if fn.Kind() != reflect.Func {
		t.Fatalf("unexpected type for switch function: %T", spec.Switch)
	}

	arity := 1 + spec.cardinality()
	if fn.Type().NumIn() != arity {
		t.Fatalf("unexpected number of arguments for switch function: got %d, want %d", fn.Type().NumIn(), arity)
	}

	if fn.Type().NumOut() != 0 {
		t.Fatalf("switch function should not return a value")
	}

	t.Run("it calls the function associated with each case", func(t *testing.T) {
		for v := range spec.Range() {
			t.Run(fmt.Sprintf("case #%d", v), func(t *testing.T) {
				args := []reflect.Value{reflect.ValueOf(v)}
				called := false

				for x := range spec.Range() {
					arg := func() { t.Errorf("invoked unexpected case function: got %d, want %d", x, v) }
					if v == x {
						arg = func() { called = true }
					}
					args = append(args, reflect.ValueOf(arg))
				}

				fn.Call(args)

				if !called {
					t.Fatalf("case function for %d was not invoked", v)
				}
			})
		}
	})

	t.Run("it panics when the associated function is nil", func(t *testing.T) {
		for v := range spec.Range() {
			t.Run(fmt.Sprintf("case #%d", v), func(t *testing.T) {
				args := []reflect.Value{reflect.ValueOf(v)}

				for x := range spec.Range() {
					arg := func() { t.Errorf("invoked unexpected case function: got %d, want %d", x, v) }
					if v == x {
						arg = nil
					}
					args = append(args, reflect.ValueOf(arg))
				}

				defer func() {
					want := fmt.Sprintf("no case function was provided for %q", v.String())
					if got := recover(); got != want {
						t.Fatalf("unexpected panic: got %q, want %q", got, want)
					}
				}()

				fn.Call(args)
			})
		}
	})

	t.Run("it panics when the kind is invalid", func(t *testing.T) {
		cases := []E{
			spec.begin() - 3,
			spec.begin() - 2,
			spec.begin() - 1,
			spec.end() + 1,
			spec.end() + 2,
			spec.end() + 3,
		}

		for _, c := range cases {
			t.Run(fmt.Sprintf("case #%d", c), func(t *testing.T) {
				args := []reflect.Value{reflect.ValueOf(c)}
				for range spec.Range() {
					var arg func()
					args = append(args, reflect.ValueOf(arg))
				}

				defer func() {
					want := fmt.Sprintf("invalid %T (%d)", c, c)
					if got := recover(); got != want {
						t.Fatalf("unexpected panic: got %q, want %q", got, want)
					}
				}()

				fn.Call(args)
			})
		}
	})
}

func enumMap[E enum.Enum](t *testing.T, spec EnumSpec[E]) {
	fn := reflect.ValueOf(spec.MapToString)

	if fn.Kind() != reflect.Func {
		t.Fatalf("unexpected type for map function: %T", spec.MapToString)
	}

	arity := 1 + spec.cardinality()
	if fn.Type().NumIn() != arity {
		t.Fatalf("unexpected number of arguments for map function: got %d, want %d", fn.Type().NumIn(), arity)
	}

	if fn.Type().NumOut() != 1 {
		t.Fatalf("unexpected number of return values for map function: got %d, want 1", fn.Type().NumOut())
	}

	t.Run("it returns the value associated with each case", func(t *testing.T) {
		for v := range spec.Range() {
			t.Run(fmt.Sprintf("case #%d", v), func(t *testing.T) {
				args := []reflect.Value{reflect.ValueOf(v)}

				for x := range spec.Range() {
					args = append(
						args,
						reflect.ValueOf(
							fmt.Sprintf("case #%d", x),
						),
					)
				}

				values := fn.Call(args)

				want := fmt.Sprintf("case #%d", v)
				got := values[0].Interface()

				if got != want {
					t.Fatalf("unexpected result: got %q, want %q", got, want)
				}
			})
		}
	})

	t.Run("it panics when the kind is invalid", func(t *testing.T) {
		cases := []E{
			spec.begin() - 3,
			spec.begin() - 2,
			spec.begin() - 1,
			spec.end() + 1,
			spec.end() + 2,
			spec.end() + 3,
		}

		for _, c := range cases {
			t.Run(fmt.Sprintf("case #%d", c), func(t *testing.T) {
				args := []reflect.Value{reflect.ValueOf(c)}

				for x := range spec.Range() {
					args = append(
						args,
						reflect.ValueOf(
							fmt.Sprintf("case #%d", x),
						),
					)
				}

				defer func() {
					want := fmt.Sprintf("invalid %T (%d)", c, c)
					if got := recover(); got != want {
						t.Fatalf("unexpected panic: got %q, want %q", got, want)
					}
				}()

				fn.Call(args)
			})
		}
	})
}
