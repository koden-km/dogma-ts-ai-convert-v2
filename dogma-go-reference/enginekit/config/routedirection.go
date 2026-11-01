package config

// RouteDirection is an bit-field of the "directions" in which a message flows
// for a specific [RouteType].
type RouteDirection int

const (
	// InboundDirection is a [RouteDirection] that indicates a message flowing
	// into a handler.
	InboundDirection RouteDirection = 1 << iota

	// OutboundDirection is a [RouteDirection] that indicates a message flowing
	// out of a handler.
	OutboundDirection
)

// Has returns true if d is a superset of dir.
func (d RouteDirection) Has(x RouteDirection) bool {
	return d&x != 0
}
