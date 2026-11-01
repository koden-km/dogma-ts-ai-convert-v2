package configbuilder

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/internal/typename"
	"github.com/dogmatiq/enginekit/message"
	"github.com/dogmatiq/enginekit/optional"
)

// Route returns a new [config.Route] as configured by fn.
func Route(fn func(*RouteBuilder)) *config.Route {
	x := &RouteBuilder{}
	fn(x)
	return x.Done()
}

// RouteBuilder constructs a [config.Route].
type RouteBuilder struct {
	target config.Route
}

// AsPerRoute configures the builder to use the same properties as r.
func (b *RouteBuilder) AsPerRoute(r dogma.MessageRoute) {
	switch r.(type) {
	case dogma.HandlesCommandRoute:
		b.target.RouteType = optional.Some(config.HandlesCommandRouteType)
	case dogma.RecordsEventRoute:
		b.target.RouteType = optional.Some(config.RecordsEventRouteType)
	case dogma.HandlesEventRoute:
		b.target.RouteType = optional.Some(config.HandlesEventRouteType)
	case dogma.ExecutesCommandRoute:
		b.target.RouteType = optional.Some(config.ExecutesCommandRouteType)
	case dogma.SchedulesDeadlineRoute:
		b.target.RouteType = optional.Some(config.SchedulesDeadlineRouteType)
	default:
		panic("unsupported route type")
	}

	messageType := r.Type()
	goType := messageType.GoType()

	b.target.MessageTypeID = optional.Some(messageType.ID())
	b.target.MessageTypeName = optional.Some(typename.Get(goType))
	b.target.MessageType = optional.Some(message.TypeFromReflect(goType))
}

// RouteType sets the route type of the route.
func (b *RouteBuilder) RouteType(t config.RouteType) {
	b.target.RouteType = optional.Some(t)
}

// MessageTypeName sets the message type name of the route.
func (b *RouteBuilder) MessageTypeName(name string) {
	b.target.MessageTypeName = optional.Some(name)
	b.target.MessageType = optional.None[message.Type]()
}

// MessageType sets the message type of the route.
func (b *RouteBuilder) MessageType(t message.Type) {
	b.target.MessageTypeName = optional.Some(typename.Get(t.ReflectType()))
	b.target.MessageType = optional.Some(t)
}

// Partial marks the compomnent as partially configured.
func (b *RouteBuilder) Partial() {
	b.target.IsPartial = true
}

// Speculative marks the component as speculative.
func (b *RouteBuilder) Speculative() {
	b.target.IsSpeculative = true
}

// Done completes the configuration of the route.
func (b *RouteBuilder) Done() *config.Route {
	return &b.target
}
