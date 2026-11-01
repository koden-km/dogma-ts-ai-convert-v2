package config

import (
	"fmt"
)

// Component is the "top-level" interface for the individual elements that form
// a complete configuration of a Dogma application or handler.
type Component interface {
	fmt.Stringer

	// ComponentProperties returns the properties common to all [Component]
	// types.
	ComponentProperties() *ComponentCommon

	validate(*validateContext)
	describe(*describeContext)
}

// ComponentCommon contains the properties common to all [Component] types.
type ComponentCommon struct {
	// IsSpeculative indicates that the [Component] is only present in the
	// configuration under certain conditions, and that those conditions could
	// not be evaluated at configuration time.
	IsSpeculative bool

	// IsPartial indicates that the configuration could not be loaded in its
	// entirety. The configuration may be valid, but cannot be safely used to
	// execute an application.
	//
	// A value of false does not imply a complete configuration.
	IsPartial bool
}

// ComponentProperties returns the properties common to all [Component] types.
func (p *ComponentCommon) ComponentProperties() *ComponentCommon {
	return p
}

func validateComponent(ctx *validateContext) {
	p := ctx.Component.ComponentProperties()

	if p.IsPartial {
		ctx.Invalid(PartialConfigurationError{})
	}

	if ctx.Options.ForExecution && p.IsSpeculative {
		ctx.Invalid(SpeculativeConfigurationError{})
	}
}

// ConfigurationUnavailableError indicates that a [Component]'s configuration is
// missing some information that is deemed necessary for the component to be
// considered valid.
type ConfigurationUnavailableError struct {
	// Description is a short description of the missing configuration.
	Description string
}

func (e ConfigurationUnavailableError) Error() string {
	return fmt.Sprintf("%s is unavailable", e.Description)
}

// PartialConfigurationError indicates that a [Component]'s configuration could
// not be loaded in its entirety.
type PartialConfigurationError struct{}

func (e PartialConfigurationError) Error() string {
	return "could not evaluate entire configuration"
}

// SpeculativeConfigurationError indicates that a [Component]'s inclusion in the
// configuration is subject to some condition that could not be evaluated at the
// time the configuration was built.
type SpeculativeConfigurationError struct{}

func (e SpeculativeConfigurationError) Error() string {
	return "conditions for the component's inclusion in the configuration could not be evaluated"
}

var (
	_ Component = (*Identity)(nil)
	_ Component = (*Flag[struct{ symbol }])(nil)
	_ Component = (*Route)(nil)

	_ Entity = (*Application)(nil)

	_ Handler = (*Aggregate)(nil)
	_ Handler = (*Process)(nil)
	_ Handler = (*Integration)(nil)
	_ Handler = (*Projection)(nil)
)
