package config

import (
	"fmt"
	"strings"

	"github.com/dogmatiq/enginekit/collections/maps"
	"github.com/dogmatiq/enginekit/message"
	"github.com/dogmatiq/enginekit/optional"
)

// A Handler is an [Entity] that represents the configuration of a Dogma
// handler.
type Handler interface {
	Entity

	// HandlerType returns [HandlerType] of the handler.
	HandlerType() HandlerType

	// IsDisabled returns true if the handler is disabled.
	//
	// It panics if the configuration does not specify unambiguously whether the
	// handler is enabled or disabled.
	IsDisabled() bool

	// HandlerProperties returns the properties common to all [Handler] types.
	HandlerProperties() *HandlerCommon
}

// HandlerCommon contains the properties common to all [Handler] types.
type HandlerCommon struct {
	EntityCommon

	RouteComponents []*Route
	DisabledFlags   []*Flag[Disabled]
}

// HandlerProperties returns the properties common to all [Handler] types.
func (p *HandlerCommon) HandlerProperties() *HandlerCommon {
	return p
}

// Disabled is the [Symbol] for a [Flag] that indicates whether or not a
// [Handler] has been disabled.
type Disabled struct{ symbol }

// MissingRouteTypeError indicates that a [Handler] is missing one of its
// required route types.
type MissingRouteTypeError struct {
	RouteType RouteType
}

func (e MissingRouteTypeError) Error() string {
	return fmt.Sprintf("no %s routes", e.RouteType)
}

// UnsupportedRouteTypeError indicates that a [Handler] is configured with a
// [Route] of a [RouteType] that is not allowed for that handler type.
type UnsupportedRouteTypeError struct {
	UnexpectedRoute *Route
}

func (e UnsupportedRouteTypeError) Error() string {
	w := &strings.Builder{}

	fmt.Fprintf(w, "unsupported %s route", e.UnexpectedRoute.RouteType.Get())

	if name, ok := e.UnexpectedRoute.MessageTypeName.TryGet(); ok {
		fmt.Fprintf(w, " for %s", name)
	}

	return w.String()
}

// DuplicateRouteError indicates that a [Handler] is configured with multiple
// routes for the same [message.Type].
type DuplicateRouteError struct {
	RouteType       RouteType
	MessageTypeName string
	DuplicateRoutes []*Route
}

func (e DuplicateRouteError) Error() string {
	return fmt.Sprintf(
		"multiple %s routes for %s",
		e.RouteType,
		e.MessageTypeName,
	)
}

func validateHandler[T any](
	ctx *validateContext,
	h Handler,
	source optional.Optional[T],
) {
	validateEntity(ctx, h, source)
	validateHandlerRoutes(ctx, h)

	for _, f := range h.HandlerProperties().DisabledFlags {
		ctx.ValidateChild(f)
	}
}

func validateHandlerRoutes(ctx *validateContext, h Handler) {
	var (
		capabilities = h.HandlerType().RouteCapabilities()
		missing      maps.Ordered[RouteType, MissingRouteTypeError]
		duplicate    maps.OrderedByKey[routeKey, DuplicateRouteError]
	)

	for rt, req := range capabilities.RouteTypes {
		if req == RouteTypeRequired {
			missing.Set(rt, MissingRouteTypeError{rt})
		}
	}

	for _, r := range h.HandlerProperties().RouteComponents {
		ctx.ValidateChild(r)

		if rt, ok := r.RouteType.TryGet(); ok {
			if capabilities.RouteTypes[rt] == RouteTypeDisallowed {
				ctx.Invalid(UnsupportedRouteTypeError{r})
			} else {
				missing.Remove(rt)
			}
		}

		if k, ok := r.key(); ok {
			duplicate.Update(
				k,
				func(err *DuplicateRouteError) {
					err.RouteType = k.RouteType
					err.MessageTypeName = k.MessageTypeName
					err.DuplicateRoutes = append(err.DuplicateRoutes, r)
				},
			)
		}
	}

	for err := range missing.Values() {
		ctx.Invalid(err)
	}

	for err := range duplicate.Values() {
		if len(err.DuplicateRoutes) > 1 {
			ctx.Invalid(err)
		}
	}
}

func resolveRouteSet(h Handler) RouteSet {
	ctx := newResolutionContext(h, false)
	return buildRouteSet(ctx, h)
}

func buildRouteSet(ctx *validateContext, h Handler) RouteSet {
	validateHandlerRoutes(ctx, h)

	set := RouteSet{}

	for _, r := range h.HandlerProperties().RouteComponents {
		rt, ok := r.RouteType.TryGet()
		if !ok {
			continue
		}

		mt, ok := r.MessageType.TryGet()
		if !ok {
			continue
		}

		if set.byMessageType == nil {
			set.byMessageType = map[message.Type]map[RouteType]map[Handler]*Route{}
		}

		byRouteType, ok := set.byMessageType[mt]
		if !ok {
			byRouteType = map[RouteType]map[Handler]*Route{}
			set.byMessageType[mt] = byRouteType
		}

		byHandler, ok := byRouteType[rt]
		if !ok {
			byHandler = map[Handler]*Route{}
			byRouteType[rt] = byHandler
		}

		byHandler[h] = r
	}

	return set
}

func resolveIsDisabled(h Handler) bool {
	p := h.HandlerProperties()

	ctx := newResolutionContext(h, false)
	for _, r := range p.DisabledFlags {
		ctx.ValidateChild(r)
	}

	n := len(p.DisabledFlags)
	if n == 0 {
		return false
	}

	return p.DisabledFlags[n-1].Value.Get()
}

func describeHandler[T any](
	ctx *describeContext,
	h Handler,
	source optional.Optional[T],
) {
	describeEntity(ctx, h, source)

	p := h.HandlerProperties()

	for _, r := range p.RouteComponents {
		ctx.DescribeChild(r)
	}

	for _, f := range p.DisabledFlags {
		ctx.DescribeChild(f)
	}
}
