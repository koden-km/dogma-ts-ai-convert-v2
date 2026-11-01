package config

import (
	"iter"
	"slices"

	"github.com/dogmatiq/enginekit/collections/sets"
	"github.com/dogmatiq/enginekit/message"
)

// RouteSet is the set of routes configured for a specific [Handler].
type RouteSet struct {
	byMessageType map[message.Type]map[RouteType]map[Handler]*Route
}

// Routes returns a sequence that yields the routes in the set, and the handler
// it belongs to.
func (s RouteSet) Routes() iter.Seq2[*Route, Handler] {
	return func(yield func(*Route, Handler) bool) {
		for _, byRouteType := range s.byMessageType {
			for _, byHandler := range byRouteType {
				for h, r := range byHandler {
					if !yield(r, h) {
						return
					}
				}
			}
		}
	}
}

// MessageTypes returns a map all of the message types in the [RouteSet] and
// their respective [RouteDirection].
func (s RouteSet) MessageTypes() map[message.Type]RouteDirection {
	types := map[message.Type]RouteDirection{}

	for mt, byRouteType := range s.byMessageType {
		for rt := range byRouteType {
			types[mt] |= rt.Direction()
		}
	}

	return types
}

// MessageTypeSet returns a set of all of the message types in the [RouteSet].
func (s RouteSet) MessageTypeSet() *sets.Set[message.Type] {
	types := &sets.Set[message.Type]{}

	for mt := range s.byMessageType {
		types.Add(mt)
	}

	return types
}

// DirectionOf returns the direction in which messages of the given type flow
// for the [Handler].
func (s RouteSet) DirectionOf(t message.Type) RouteDirection {
	var dir RouteDirection

	for rt := range s.byMessageType[t] {
		dir |= rt.Direction()
	}

	return dir
}

// HasMessageType returns true if the [RouteSet] contains any routes for the
// given message type.
func (s RouteSet) HasMessageType(t message.Type) bool {
	_, ok := s.byMessageType[t]
	return ok
}

// Filter returns a new [RouteSet] that contains only the routes that match all
// of the given filters.
func (s RouteSet) Filter(filters ...RouteSetFilter) RouteSet {
	var filter routeSetFilters
	for _, f := range filters {
		f(&filter)
	}

	byMessageTypeFiltered := map[message.Type]map[RouteType]map[Handler]*Route{}

	for mt, byRouteType := range s.byMessageType {
		byRouteTypeFiltered := map[RouteType]map[Handler]*Route{}

		for rt, byHandler := range byRouteType {
			byHandlerFiltered := map[Handler]*Route{}

			for h, r := range byHandler {
				if filter.TestRoute(r) {
					byHandlerFiltered[h] = r
				}
			}

			if len(byHandlerFiltered) != 0 {
				byRouteTypeFiltered[rt] = byHandlerFiltered
			}
		}

		if len(byRouteTypeFiltered) != 0 && filter.TestMessage(mt, byRouteTypeFiltered) {
			byMessageTypeFiltered[mt] = byRouteTypeFiltered
		}
	}

	return RouteSet{byMessageTypeFiltered}
}

func (s *RouteSet) merge(set RouteSet) {
	for mt, byRouteTypeSource := range set.byMessageType {
		if s.byMessageType == nil {
			s.byMessageType = map[message.Type]map[RouteType]map[Handler]*Route{}
		}

		byRouteTypeTarget, ok := s.byMessageType[mt]
		if !ok {
			byRouteTypeTarget = map[RouteType]map[Handler]*Route{}
			s.byMessageType[mt] = byRouteTypeTarget
		}

		for rt, byHandlerSource := range byRouteTypeSource {
			byHandlerTarget, ok := byRouteTypeTarget[rt]
			if !ok {
				byHandlerTarget = map[Handler]*Route{}
				byRouteTypeTarget[rt] = byHandlerTarget
			}

			for h, r := range byHandlerSource {
				byHandlerTarget[h] = r
			}
		}
	}
}

// RouteSetFilter applies a filter to the routes within a [RouteSet].
type RouteSetFilter func(*routeSetFilters)

// FilterByRouteType is a [RouteSetFilter] that limits results to routes with
// one of the given [RouteType] values.
func FilterByRouteType(types ...RouteType) RouteSetFilter {
	return func(f *routeSetFilters) {
		f.routePredicates = append(
			f.routePredicates,
			func(r *Route) bool {
				return slices.Contains(types, r.RouteType.Get())
			},
		)
	}
}

// FilterByRouteDirection is a [RouteSetFilter] that limits results to routes
// with a [RouteDirection] that matches one of the given directions bit-masks.
func FilterByRouteDirection(directions ...RouteDirection) RouteSetFilter {
	return func(f *routeSetFilters) {
		f.routePredicates = append(
			f.routePredicates,
			func(r *Route) bool {
				for _, dir := range directions {
					if dir.Has(r.RouteType.Get().Direction()) {
						return true
					}
				}
				return false
			},
		)
	}
}

// FilterByMessageKind is a [RouteSetFilter] that limits results to routes with
// a [message.Kind] that matches one of the given kinds.
func FilterByMessageKind(kinds ...message.Kind) RouteSetFilter {
	return func(f *routeSetFilters) {
		f.routePredicates = append(
			f.routePredicates,
			func(r *Route) bool {
				return slices.Contains(kinds, r.MessageType.Get().Kind())
			},
		)
	}
}

// FilterByMessageType is a [RouteSetFilter] that limits results to routes
// with a [message.Type] that matches one of the given types.
func FilterByMessageType(kinds ...message.Kind) RouteSetFilter {
	return func(f *routeSetFilters) {
		f.routePredicates = append(
			f.routePredicates,
			func(r *Route) bool {
				return slices.Contains(kinds, r.RouteType.Get().MessageKind())
			},
		)
	}
}

// FilterByMessageDirection is a [RouteSetFilter] that limits results to routes
// for message types that have a [RouteDirection] that matches one of the given
// directions bit-masks, when considering all routes for that message type.
func FilterByMessageDirection(directions ...RouteDirection) RouteSetFilter {
	return func(f *routeSetFilters) {
		f.messagePredicates = append(
			f.messagePredicates,
			func(_ message.Type, routes map[RouteType]map[Handler]*Route) bool {
				var d RouteDirection

				for rt := range routes {
					d |= rt.Direction()
				}

				for _, dir := range directions {
					if dir.Has(d) {
						return true
					}
				}

				return false
			},
		)
	}
}

type routeSetFilters struct {
	routePredicates   []func(r *Route) bool
	messagePredicates []func(t message.Type, routes map[RouteType]map[Handler]*Route) bool
}

func (f routeSetFilters) TestRoute(r *Route) bool {
	for _, p := range f.routePredicates {
		if !p(r) {
			return false
		}
	}
	return true
}

func (f routeSetFilters) TestMessage(t message.Type, routes map[RouteType]map[Handler]*Route) bool {
	for _, p := range f.messagePredicates {
		if !p(t, routes) {
			return false
		}
	}
	return true
}
