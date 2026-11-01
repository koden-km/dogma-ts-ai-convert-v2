package stubs

import (
	"context"

	"github.com/dogmatiq/dogma"
)

// IntegrationMessageHandlerStub is a test implementation of
// [dogma.IntegrationMessageHandler].
type IntegrationMessageHandlerStub struct {
	ConfigureFunc     func(dogma.IntegrationConfigurer)
	HandleCommandFunc func(context.Context, dogma.IntegrationCommandScope, dogma.Command) error
}

var _ dogma.IntegrationMessageHandler = &IntegrationMessageHandlerStub{}

// Configure describes the handler's configuration to the engine.
func (h *IntegrationMessageHandlerStub) Configure(c dogma.IntegrationConfigurer) {
	if h.ConfigureFunc != nil {
		h.ConfigureFunc(c)
	}
}

// HandleCommand handles a command, typically by invoking some external API.
func (h *IntegrationMessageHandlerStub) HandleCommand(
	ctx context.Context,
	s dogma.IntegrationCommandScope,
	c dogma.Command,
) error {
	if h.HandleCommandFunc != nil {
		return h.HandleCommandFunc(ctx, s, c)
	}
	return nil
}
