package configbuilder

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
)

// Aggregate returns a new [config.AggregateX] as configured by fn.
func Aggregate(fn func(*AggregateBuilder)) *config.Aggregate {
	x := &AggregateBuilder{}
	fn(x)
	return x.Done()
}

// AggregateBuilder constructs a [config.Aggregate].
type AggregateBuilder struct {
	target config.Aggregate
}

// TypeName sets the name of the concrete type that implements
// [dogma.AggregateMessageHandler].
func (b *AggregateBuilder) TypeName(n string) {
	setTypeName(&b.target.TypeName, &b.target.Source, n)
}

// Source sets the source value to h.
func (b *AggregateBuilder) Source(h dogma.AggregateMessageHandler[dogma.AggregateRoot]) {
	setSource(&b.target.TypeName, &b.target.Source, h)
}

// Identity calls fn which configures a [config.Identity] that is added to the
// handler.
func (b *AggregateBuilder) Identity(fn func(*IdentityBuilder)) {
	b.target.IdentityComponents = append(b.target.IdentityComponents, Identity(fn))
}

// Route calls fn which configures a [config.Route] that is added to the
// handler.
func (b *AggregateBuilder) Route(fn func(*RouteBuilder)) {
	b.target.RouteComponents = append(b.target.RouteComponents, Route(fn))
}

// Disabled calls fn which configures a [config.FlagModification] that is added
// to the handler's disabled flag.
func (b *AggregateBuilder) Disabled(fn func(*FlagBuilder[config.Disabled])) {
	b.target.DisabledFlags = append(b.target.DisabledFlags, Flag(fn))
}

// Partial marks the compomnent as partially configured.
func (b *AggregateBuilder) Partial() {
	b.target.IsPartial = true
}

// Speculative marks the component as speculative.
func (b *AggregateBuilder) Speculative() {
	b.target.IsSpeculative = true
}

// Done completes the configuration of the handler.
func (b *AggregateBuilder) Done() *config.Aggregate {
	return &b.target
}
