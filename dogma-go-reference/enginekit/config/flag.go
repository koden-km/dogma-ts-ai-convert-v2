package config

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/dogmatiq/enginekit/optional"
)

// A Symbol is a type that uniquely identifies a specific [Flag].
type Symbol interface {
	~struct{ symbol }
}

// symbol is a "marker" struct that is embedded in named types to declare a
// new [Symbol].
type symbol struct{}

func stringifySymbol[S Symbol]() string {
	return strings.ToLower(reflect.TypeFor[S]().Name())
}

// A Flag represents a change to some boolean state of a [Component].
//
// Each type of flag is uniquely identified by a [Symbol].
type Flag[S Symbol] struct {
	ComponentCommon

	// Value is the boolean value to which the flag was set, if known.
	Value optional.Optional[bool]
}

func (f *Flag[S]) String() string {
	var w strings.Builder

	w.WriteString("flag:")
	w.WriteString(stringifySymbol[S]())

	if v, ok := f.Value.TryGet(); ok {
		w.WriteString(fmt.Sprintf(":%t", v))
	}

	return w.String()
}

func (f *Flag[S]) validate(ctx *validateContext) {
	validateComponent(ctx)

	if ctx.Options.ForExecution && !f.Value.IsPresent() {
		ctx.Absent("value")
	}
}

func (f *Flag[S]) describe(ctx *describeContext) {
	ctx.DescribeFidelity()
	ctx.Print(stringifySymbol[S]())
	ctx.Print(" flag")

	if v, ok := f.Value.TryGet(); ok {
		ctx.Printf(", set to %t", v)
	}

	ctx.Print("\n")
}
