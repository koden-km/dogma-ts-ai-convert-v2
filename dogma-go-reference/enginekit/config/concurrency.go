package config

import (
	"fmt"
	"strings"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/optional"
)

// A ConcurrencyPreference represents the configuration of handler's
// [dogma.ConcurrencyPreference].
type ConcurrencyPreference struct {
	ComponentCommon

	// Value is the value itself, if known.
	Value optional.Optional[dogma.ConcurrencyPreference]
}

func (v *ConcurrencyPreference) String() string {
	var w strings.Builder

	w.WriteString("concurrency preference")

	if v, ok := v.Value.TryGet(); ok {
		w.WriteByte(':')

		switch v {
		case dogma.MinimizeConcurrency:
			w.WriteString("dogma.MinimizeConcurrency")
		case dogma.MaximizeConcurrency:
			w.WriteString("dogma.MaximizeConcurrency")
		default:
			fmt.Fprintf(&w, "<%d>", v)
		}
	}

	return w.String()
}

func (v *ConcurrencyPreference) validate(ctx *validateContext) {
	validateComponent(ctx)

	if v, ok := v.Value.TryGet(); ok {
		switch v {
		case dogma.MinimizeConcurrency:
		case dogma.MaximizeConcurrency:
		default:
			ctx.Invalid(UnrecognizedConcurrencyPreference{v})
		}
	} else if ctx.Options.ForExecution {
		ctx.Absent("value")
	}
}

func (v *ConcurrencyPreference) describe(ctx *describeContext) {
	ctx.DescribeFidelity()
	ctx.Print("concurrency preference")

	if v, ok := v.Value.TryGet(); ok {
		ctx.Printf(", set to ")

		switch v {
		case dogma.MinimizeConcurrency:
			ctx.Print("dogma.MinimizeConcurrency")
		case dogma.MaximizeConcurrency:
			ctx.Print("dogma.MaximizeConcurrency")
		default:
			ctx.Printf("<%d>", v)
		}
	}

	ctx.Print("\n")
}

func validateConcurrencyPreferences(
	ctx *validateContext,
	prefs []*ConcurrencyPreference,
) {
	for _, p := range prefs {
		ctx.ValidateChild(p)
	}
}

func describeConcurrencyPreferences(
	ctx *describeContext,
	prefs []*ConcurrencyPreference,
) {
	for _, p := range prefs {
		ctx.DescribeChild(p)
	}
}

func resolveConcurrencyPreference(h Handler, prefs []*ConcurrencyPreference) dogma.ConcurrencyPreference {
	ctx := newResolutionContext(h, false)
	for _, r := range prefs {
		ctx.ValidateChild(r)
	}

	n := len(prefs)
	if n == 0 {
		return dogma.MaximizeConcurrency
	}

	return prefs[n-1].Value.Get()
}

// UnrecognizedConcurrencyPreference indicates that a handler's
// [dogma.ConcurrencyPreference] is invalid.
type UnrecognizedConcurrencyPreference struct {
	InvalidValue dogma.ConcurrencyPreference
}

func (e UnrecognizedConcurrencyPreference) Error() string {
	return fmt.Sprintf("invalid concurrency preference (%v), expected dogma.MinimizeConcurrency or dogma.MaximizeConcurrency", e.InvalidValue)
}
