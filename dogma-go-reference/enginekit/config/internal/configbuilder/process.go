package configbuilder

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
)

// Process returns a new [config.Process] as configured by fn.
func Process(fn func(*ProcessBuilder)) *config.Process {
	x := &ProcessBuilder{}
	fn(x)
	return x.Done()
}

// ProcessBuilder constructs a [config.Process].
type ProcessBuilder struct {
	target config.Process
}

// TypeName sets the name of the concrete type that implements
// [dogma.ProcessMessageHandler].
func (b *ProcessBuilder) TypeName(n string) {
	setTypeName(&b.target.TypeName, &b.target.Source, n)
}

// Source sets the source value to h.
func (b *ProcessBuilder) Source(h dogma.ProcessMessageHandler[dogma.ProcessRoot]) {
	setSource(&b.target.TypeName, &b.target.Source, h)
}

// Identity calls fn which configures a [config.Identity] that is added to the
// handler.
func (b *ProcessBuilder) Identity(fn func(*IdentityBuilder)) {
	b.target.IdentityComponents = append(b.target.IdentityComponents, Identity(fn))
}

// Route calls fn which configures a [config.Route] that is added to the
// handler.
func (b *ProcessBuilder) Route(fn func(*RouteBuilder)) {
	b.target.RouteComponents = append(b.target.RouteComponents, Route(fn))
}

// Disabled calls fn which configures a [config.FlagModification] that is added
// to the handler's disabled flag.
func (b *ProcessBuilder) Disabled(fn func(*FlagBuilder[config.Disabled])) {
	b.target.DisabledFlags = append(b.target.DisabledFlags, Flag(fn))
}

// Partial marks the compomnent as partially configured.
func (b *ProcessBuilder) Partial() {
	b.target.IsPartial = true
}

// Speculative marks the component as speculative.
func (b *ProcessBuilder) Speculative() {
	b.target.IsSpeculative = true
}

// Done completes the configuration of the handler.
func (b *ProcessBuilder) Done() *config.Process {
	return &b.target
}
