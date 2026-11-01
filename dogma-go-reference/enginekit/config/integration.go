package config

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/optional"
	"github.com/dogmatiq/enginekit/protobuf/identitypb"
)

// Integration is a [Handler] that represents the configuration of a
// [dogma.IntegrationMessageHandler].
type Integration struct {
	HandlerCommon
	Source                 optional.Optional[dogma.IntegrationMessageHandler]
	ConcurrencyPreferences []*ConcurrencyPreference
}

// Identity returns the entity's identity.
//
// It panics the configuration does not specify a singular valid identity.
func (h *Integration) Identity() *identitypb.Identity {
	return resolveIdentity(h)
}

// HandlerType returns the [HandlerType] of the handler.
func (h *Integration) HandlerType() HandlerType {
	return IntegrationHandlerType
}

// RouteSet returns the routes configured for the entity.
//
// It panics if the configuration does not specify a complete set of valid
// routes for the entity and its constituents.
func (h *Integration) RouteSet() RouteSet {
	return resolveRouteSet(h)
}

// IsDisabled returns true if the handler is disabled.
//
// It panics if the configuration does not specify unambiguously whether the
// handler is enabled or disabled.
func (h *Integration) IsDisabled() bool {
	return resolveIsDisabled(h)
}

// ConcurrencyPreference returns the [dogma.ConcurrencyPreference] for the
// handler.
//
// It panics if the configuration does not specify the preference unambiguously.
func (h *Integration) ConcurrencyPreference() dogma.ConcurrencyPreference {
	return resolveConcurrencyPreference(h, h.ConcurrencyPreferences)
}

// Interface returns the [dogma.IntegrationMessageHandler] that the entity
// represents.
func (h *Integration) Interface() dogma.IntegrationMessageHandler {
	return resolveInterface(h, h.Source)
}

// Implementation returns the unwrapped implementation of the handler.
func (h *Integration) Implementation() dogma.IntegrationMessageHandler {
	return dogma.UnwrapHandler(h.Interface()).(dogma.IntegrationMessageHandler)
}

func (h *Integration) String() string {
	return stringifyEntity(h)
}

func (h *Integration) validate(ctx *validateContext) {
	validateHandler(ctx, h, h.Source)
	validateConcurrencyPreferences(ctx, h.ConcurrencyPreferences)

}

func (h *Integration) describe(ctx *describeContext) {
	describeHandler(ctx, h, h.Source)
	describeConcurrencyPreferences(ctx, h.ConcurrencyPreferences)
}
