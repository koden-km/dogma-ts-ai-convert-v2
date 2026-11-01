package stubs

import "github.com/dogmatiq/dogma"

// ApplicationStub is a test implementation of [dogma.Application].
type ApplicationStub struct {
	ConfigureFunc func(dogma.ApplicationConfigurer)
}

var _ dogma.Application = &ApplicationStub{}

// Configure describes the application's configuration to the engine.
func (a *ApplicationStub) Configure(c dogma.ApplicationConfigurer) {
	if a.ConfigureFunc != nil {
		a.ConfigureFunc(c)
	}
}
