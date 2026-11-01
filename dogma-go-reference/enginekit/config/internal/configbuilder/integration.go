package configbuilder

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
)

// Integration returns a new [config.Integration] as configured by fn.
func Integration(fn func(*IntegrationBuilder)) *config.Integration {
	x := &IntegrationBuilder{}
	fn(x)
	return x.Done()
}

// IntegrationBuilder constructs a [config.Integration].
type IntegrationBuilder struct {
	target config.Integration
}

// TypeName sets the name of the concrete type that implements
// [dogma.IntegrationMessageHandler].
func (b *IntegrationBuilder) TypeName(n string) {
	setTypeName(&b.target.TypeName, &b.target.Source, n)
}

// Source sets the source value to h.
func (b *IntegrationBuilder) Source(h dogma.IntegrationMessageHandler) {
	setSource(&b.target.TypeName, &b.target.Source, h)
}

// Identity calls fn which configures a [config.Identity] that is added to the
// handler.
func (b *IntegrationBuilder) Identity(fn func(*IdentityBuilder)) {
	b.target.IdentityComponents = append(b.target.IdentityComponents, Identity(fn))
}

// Route calls fn which configures a [config.Route] that is added to the
// handler.
func (b *IntegrationBuilder) Route(fn func(*RouteBuilder)) {
	b.target.RouteComponents = append(b.target.RouteComponents, Route(fn))
}

// Disabled calls fn which configures a [config.FlagModification] that is added
// to the handler's disabled flag.
func (b *IntegrationBuilder) Disabled(fn func(*FlagBuilder[config.Disabled])) {
	b.target.DisabledFlags = append(b.target.DisabledFlags, Flag(fn))
}

// ConcurrencyPreference sets the concurrency preference of the handler.
func (b *IntegrationBuilder) ConcurrencyPreference(fn func(*ConcurrencyPreferenceBuilder)) {
	b.target.ConcurrencyPreferences = append(b.target.ConcurrencyPreferences, ConcurrencyPreference(fn))
}

// Partial marks the compomnent as partially configured.
func (b *IntegrationBuilder) Partial() {
	b.target.IsPartial = true
}

// Speculative marks the component as speculative.
func (b *IntegrationBuilder) Speculative() {
	b.target.IsSpeculative = true
}

// Done completes the configuration of the handler.
func (b *IntegrationBuilder) Done() *config.Integration {
	return &b.target
}
