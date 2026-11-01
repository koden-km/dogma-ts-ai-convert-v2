package config

import "github.com/dogmatiq/enginekit/message"

// RouteCapability is describes how a [HandlerType] makes use of a particular
// [RouteType], if at all.
type RouteCapability int

const (
	// RouteTypeDisallowed indicates that the [HandlerType] does not support the
	// [RouteType].
	RouteTypeDisallowed RouteCapability = iota

	// RouteTypeAllowed indicates that the [HandlerType] supports the
	// [RouteType], but it is not required.
	RouteTypeAllowed

	// RouteTypeRequired indicates that the [HandlerType] requires at least one
	// route of the [RouteType].
	RouteTypeRequired
)

// RouteCapabilities is a map that describes how a [HandlerType] makes use of
// each [RouteType].
type RouteCapabilities struct {
	RouteTypes map[RouteType]RouteCapability
}

// DirectionOf returns the direction in which messages of the given kind flow
// for the [HandlerType].
func (c RouteCapabilities) DirectionOf(k message.Kind) RouteDirection {
	var dir RouteDirection

	for t, cap := range c.RouteTypes {
		if cap != RouteTypeDisallowed {
			if t.MessageKind() == k {
				dir |= t.Direction()
			}
		}
	}

	return dir
}
