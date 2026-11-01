package configbuilder

import (
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/optional"
)

// Flag returns a new [config.Flag] as configured by fn.
func Flag[S config.Symbol](fn func(*FlagBuilder[S])) *config.Flag[S] {
	x := &FlagBuilder[S]{}
	fn(x)
	return x.Done()
}

// FlagBuilder constructs a [config.Flag].
type FlagBuilder[S config.Symbol] struct {
	target config.Flag[S]
}

// Value sets the value of the target [config.Flag].
func (b *FlagBuilder[S]) Value(v bool) {
	b.target.Value = optional.Some(v)
}

// Partial marks the compomnent as partially configured.
func (b *FlagBuilder[S]) Partial() {
	b.target.IsPartial = true
}

// Speculative marks the component as speculative.
func (b *FlagBuilder[S]) Speculative() {
	b.target.IsSpeculative = true
}

// Done completes the configuration of the flag.
func (b *FlagBuilder[S]) Done() *config.Flag[S] {
	return &b.target
}
