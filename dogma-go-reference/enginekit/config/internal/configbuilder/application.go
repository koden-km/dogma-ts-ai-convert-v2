package configbuilder

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
)

// Application returns a new [config.Application] as configured by fn.
func Application(fn func(*ApplicationBuilder)) *config.Application {
	x := &ApplicationBuilder{}
	fn(x)
	return x.Done()
}

// ApplicationBuilder constructs a [config.Application].
type ApplicationBuilder struct {
	target config.Application
}

// TypeName sets the name of the concrete type that implements
// [dogma.Application].
func (b *ApplicationBuilder) TypeName(n string) {
	setTypeName(&b.target.TypeName, &b.target.Source, n)
}

// Source sets the source value to app.
func (b *ApplicationBuilder) Source(app dogma.Application) {
	setSource(&b.target.TypeName, &b.target.Source, app)
}

// Identity calls fn which configures a [config.Identity] that is added to the
// application.
func (b *ApplicationBuilder) Identity(fn func(*IdentityBuilder)) {
	b.target.IdentityComponents = append(b.target.IdentityComponents, Identity(fn))
}

// Aggregate calls fn which configures a [config.Aggregate] that is added to the
// application.
func (b *ApplicationBuilder) Aggregate(fn func(*AggregateBuilder)) {
	b.target.HandlerComponents = append(b.target.HandlerComponents, Aggregate(fn))
}

// Process calls fn which configures a [config.Process] that is added to the
// application.
func (b *ApplicationBuilder) Process(fn func(*ProcessBuilder)) {
	b.target.HandlerComponents = append(b.target.HandlerComponents, Process(fn))
}

// Integration calls fn which configures a [config.Integration] that is added to
// the application.
func (b *ApplicationBuilder) Integration(fn func(*IntegrationBuilder)) {
	b.target.HandlerComponents = append(b.target.HandlerComponents, Integration(fn))
}

// Projection calls fn which configures a [config.Projection] that is added to
// the application.
func (b *ApplicationBuilder) Projection(fn func(*ProjectionBuilder)) {
	b.target.HandlerComponents = append(b.target.HandlerComponents, Projection(fn))
}

// Partial marks the compomnent as partially configured.
func (b *ApplicationBuilder) Partial() {
	b.target.IsPartial = true
}

// Speculative marks the component as speculative.
func (b *ApplicationBuilder) Speculative() {
	b.target.IsSpeculative = true
}

// Done sanity checks the configuration and returns the completed component.
func (b *ApplicationBuilder) Done() *config.Application {
	return &b.target
}
