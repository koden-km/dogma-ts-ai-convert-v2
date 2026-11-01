package config

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/optional"
	"github.com/dogmatiq/enginekit/protobuf/identitypb"
)

// Aggregate is a [Handler] that represents the configuration of a
// [dogma.AggregateMessageHandler].
type Aggregate struct {
	HandlerCommon
	Source optional.Optional[dogma.AggregateMessageHandler[dogma.AggregateRoot]]
}

// Identity returns the entity's identity.
//
// It panics the configuration does not specify a singular valid identity.
func (h *Aggregate) Identity() *identitypb.Identity {
	return resolveIdentity(h)
}

// HandlerType returns the [HandlerType] of the handler.
func (h *Aggregate) HandlerType() HandlerType {
	return AggregateHandlerType
}

// RouteSet returns the routes configured for the entity.
//
// It panics if the configuration does not specify a complete set of valid
// routes for the entity and its constituents.
func (h *Aggregate) RouteSet() RouteSet {
	return resolveRouteSet(h)
}

// IsDisabled returns true if the handler is disabled.
//
// It panics if the configuration does not specify unambiguously whether the
// handler is enabled or disabled.
func (h *Aggregate) IsDisabled() bool {
	return resolveIsDisabled(h)
}

// Interface returns the [dogma.AggregateMessageHandler] that the entity represents.
func (h *Aggregate) Interface() dogma.AggregateMessageHandler[dogma.AggregateRoot] {
	return resolveInterface(h, h.Source)
}

// Implementation returns the unwrapped implementation of the handler.
//
// It returns the handler value as provided by the application, without the
// type-erasure wrapper applied by [dogma.UntypedAggregateMessageHandler].
func (h *Aggregate) Implementation() UntypedAggregateMessageHandler {
	return dogma.UnwrapHandler(h.Interface()).(UntypedAggregateMessageHandler)
}

func (h *Aggregate) String() string {
	return stringifyEntity(h)
}

func (h *Aggregate) validate(ctx *validateContext) {
	validateHandler(ctx, h, h.Source)
}

func (h *Aggregate) describe(ctx *describeContext) {
	describeHandler(ctx, h, h.Source)
}
