package config

import (
	"reflect"
	"slices"
	"strings"

	"github.com/dogmatiq/enginekit/internal/typename"
	"github.com/dogmatiq/enginekit/optional"
	"github.com/dogmatiq/enginekit/protobuf/identitypb"
	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
)

// An Entity is a [Component] that that represents the configuration of a Dogma
// entity, which is a type that implements one of the following interfaces:
//
//   - [dogma.Application]
//   - [dogma.AggregateMessageHandler]
//   - [dogma.ProcessMessageHandler]
//   - [dogma.IntegrationMessageHandler]
//   - [dogma.ProjectionMessageHandler]
//
// See [Handler] for a more specific interface that represents the
// configuration of a Dogma handler.
type Entity interface {
	Component

	// Identity returns the entity's identity.
	//
	// It panics the configuration does not specify a singular valid identity.
	Identity() *identitypb.Identity

	// RouteSet returns the routes configured for the entity.
	//
	// It panics if the configuration does not specify a complete set of valid
	// routes for the entity and its constituents.
	RouteSet() RouteSet

	// EntityProperties returns the properties common to all [Entity] types.
	EntityProperties() *EntityCommon
}

// EntityCommon contains the properties common to all [Entity] types.
type EntityCommon struct {
	ComponentCommon
	TypeName           optional.Optional[string]
	IdentityComponents []*Identity
}

// EntityProperties returns the properties common to all [Entity] types.
func (p *EntityCommon) EntityProperties() *EntityCommon {
	return p
}

// UnidentifiedEntityError indicates that an [Entity] has been configured
// without an [Identity].
type UnidentifiedEntityError struct{}

func (e UnidentifiedEntityError) Error() string {
	return "no identity"
}

// AmbiguouslyIdentifiedEntityError indicates that an [Entity] has been
// configured with more than one [Identity].
type AmbiguouslyIdentifiedEntityError struct {
	Identities []*Identity
}

func (e AmbiguouslyIdentifiedEntityError) Error() string {
	return "multiple identities"
}

func validateEntity[T any](
	ctx *validateContext,
	e Entity,
	src optional.Optional[T],
) {
	validateComponent(ctx)
	validateEntityIdentities(ctx, e)

	hasN := e.EntityProperties().TypeName.IsPresent()
	hasS := src.IsPresent()

	if hasS {
		if !hasN {
			ctx.Malformed("Source is present, but TypeName is not")
		}
	} else if ctx.Options.ForExecution {
		ctx.Absent(reflect.TypeFor[T]().String() + " value")
	}
}

func validateEntityIdentities(ctx *validateContext, e Entity) {
	identities := e.EntityProperties().IdentityComponents

	if len(identities) == 0 {
		ctx.Invalid(UnidentifiedEntityError{})
	} else if len(identities) > 1 {
		ctx.Invalid(AmbiguouslyIdentifiedEntityError{slices.Clone(identities)})
	}

	for _, i := range identities {
		ctx.ValidateChild(i)
	}
}

func resolveIdentity(e Entity) *identitypb.Identity {
	ctx := newResolutionContext(e, false)
	validateEntityIdentities(ctx, e)

	id := e.EntityProperties().IdentityComponents[0]

	return identitypb.
		NewIdentityBuilder().
		WithName(id.Name.Get()).
		WithKey(uuidpb.MustParse(id.Key.Get())).
		Build()
}

func resolveInterface[T any](e Entity, src optional.Optional[T]) T {
	ctx := newResolutionContext(e, true)

	v, ok := src.TryGet()
	if !ok {
		ctx.Absent(reflect.TypeFor[T]().String() + " value")
	}

	return v
}

func entityLabel(e Entity) string {
	return strings.ToLower(
		reflect.TypeOf(e).Elem().Name(),
	)
}

func stringifyEntity(e Entity) string {
	var w strings.Builder

	w.WriteString(entityLabel(e))

	if n, ok := e.EntityProperties().TypeName.TryGet(); ok {
		n = typename.Unqualified(n)
		n = strings.TrimPrefix(n, "*")
		w.WriteByte(':')
		w.WriteString(n)
	}

	return w.String()
}

func describeEntity[T any](
	ctx *describeContext,
	e Entity,
	source optional.Optional[T],
) {
	p := e.EntityProperties()

	ctx.DescribeFidelity()
	ctx.Print(entityLabel(e))

	if n, ok := p.TypeName.TryGet(); ok {
		ctx.Print(" ")
		ctx.Print(n)

		if !source.IsPresent() {
			ctx.Print(" (value unavailable)")
		}
	}

	ctx.Print("\n")
	ctx.DescribeErrors()

	for _, i := range p.IdentityComponents {
		ctx.DescribeChild(i)
	}
}
