package config

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/optional"
	"github.com/dogmatiq/enginekit/protobuf/identitypb"
)

// Process is a [Handler] that represents the configuration of a
// [dogma.ProcessMessageHandler].
type Process struct {
	HandlerCommon
	Source optional.Optional[dogma.ProcessMessageHandler[dogma.ProcessRoot]]
}

// Identity returns the entity's identity.
//
// It panics the configuration does not specify a singular valid identity.
func (h *Process) Identity() *identitypb.Identity {
	return resolveIdentity(h)
}

// HandlerType returns the [HandlerType] of the handler.
func (h *Process) HandlerType() HandlerType {
	return ProcessHandlerType
}

// RouteSet returns the routes configured for the entity.
//
// It panics if the configuration does not specify a complete set of valid
// routes for the entity and its constituents.
func (h *Process) RouteSet() RouteSet {
	return resolveRouteSet(h)
}

// IsDisabled returns true if the handler is disabled.
//
// It panics if the configuration does not specify unambiguously whether the
// handler is enabled or disabled.
func (h *Process) IsDisabled() bool {
	return resolveIsDisabled(h)
}

// Interface returns the [dogma.ProcessMessageHandler] that the entity represents.
func (h *Process) Interface() dogma.ProcessMessageHandler[dogma.ProcessRoot] {
	return resolveInterface(h, h.Source)
}

// Implementation returns the unwrapped implementation of the handler.
//
// It returns the handler value as provided by the application, without the
// type-erasure wrapper applied by [dogma.UntypedProcessMessageHandler].
func (h *Process) Implementation() UntypedProcessMessageHandler {
	return dogma.UnwrapHandler(h.Interface()).(UntypedProcessMessageHandler)
}

func (h *Process) String() string {
	return stringifyEntity(h)
}

func (h *Process) validate(ctx *validateContext) {
	validateHandler(ctx, h, h.Source)
}

func (h *Process) describe(ctx *describeContext) {
	describeHandler(ctx, h, h.Source)
}
