package envelope

import (
	"fmt"
	"reflect"
	"slices"
	"time"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/protobuf/envelopepb"
	"github.com/dogmatiq/protobuf/identitypb"
	"github.com/dogmatiq/protobuf/uuidpb"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// A Packer puts messages into envelopes.
type Packer struct {
	// Site is the (optional) identity of the site that the source application
	// is running within.
	//
	// The site is used to disambiguate between messages from different
	// installations of the same application.
	Site *identitypb.Identity

	// Application is the identity of the application that is the source of the
	// messages.
	Application *identitypb.Identity

	// GenerateID is a function used to generate new message IDs.
	//
	// If it is nil, a random UUID is generated.
	GenerateID func() *uuidpb.UUID

	// Now is a function used to get the current time. If it is nil, time.Now()
	// is used.
	Now func() time.Time
}

// PackCommand returns an envelope containing the given command.
func (p *Packer) PackCommand(m dogma.Command, options ...PackCommandOption) *envelopepb.Envelope {
	mt, ok := dogma.RegisteredMessageTypeOf(m)
	if !ok {
		panic(fmt.Sprintf(
			"%T is not a registered message type",
			m,
		))
	}

	data, err := m.MarshalBinary()
	if err != nil {
		panic(fmt.Sprintf(
			"unable to marshal %T: %s",
			m,
			err,
		))
	}

	id := p.generateID()

	env := envelopepb.NewEnvelopeBuilder().
		WithHeader(
			envelopepb.NewHeaderBuilder().
				WithCausationId(id).
				WithCorrelationId(id).
				WithSource(envelopepb.NewSourceBuilder().
					WithSite(p.Site).
					WithApplication(p.Application).
					Build()).
				Build(),
		).
		WithBody(
			envelopepb.NewBodyBuilder().
				WithMessageId(id).
				WithMessage(envelopepb.NewMessageBuilder().
					WithTypeId(uuidpb.MustParse(mt.ID())).
					WithDescription(m.MessageDescription()).
					WithData(data).
					Build()).
				Build(),
		).
		Build()

	for _, opt := range options {
		opt.applyPackCommandOption(env)
	}

	if !env.GetBody().HasCreatedAt() {
		env.GetBody().SetCreatedAt(p.now())
	}

	// For a "single envelope" we normalize extensions and baggage into the body.
	env.GetBody().SetExtensions(flattenAnyValues(env.GetHeader().GetExtensions(), env.GetBody().GetExtensions()))
	env.GetBody().SetBaggage(flattenAnyValues(env.GetHeader().GetBaggage(), env.GetBody().GetBaggage()))
	env.GetHeader().SetExtensions(nil)
	env.GetHeader().SetBaggage(nil)

	if err := env.Validate(); err != nil {
		panic(err)
	}

	return env
}

// Unpack returns the message contained within an envelope.
//
// T may be a message interface such as [dogma.Command] or a concrete message
// type.
func Unpack[T dogma.Message](env *envelopepb.Envelope) (T, error) {
	var zero T

	message := env.GetBody().GetMessage()

	if err := message.Validate(); err != nil {
		return zero, fmt.Errorf(
			"unable to unpack envelope as %s: %w",
			reflect.TypeFor[T](),
			err,
		)
	}

	mt, ok := dogma.RegisteredMessageTypeByID(message.GetTypeId().AsString())
	if !ok {
		return zero, fmt.Errorf(
			"unable to unpack envelope as %s: %s is not a registered message type ID",
			reflect.TypeFor[T](),
			message.GetTypeId(),
		)
	}

	m := mt.New()

	v, ok := any(m).(T)
	if !ok {
		return zero, fmt.Errorf(
			"unable to unpack envelope as %s: message type %s is registered as %T",
			reflect.TypeFor[T](),
			message.GetTypeId(),
			m,
		)
	}

	if err := m.UnmarshalBinary(message.GetData()); err != nil {
		return zero, fmt.Errorf(
			"unable to unpack envelope as %s: unable to unmarshal %T: %w",
			reflect.TypeFor[T](),
			m,
			err,
		)
	}

	return v, nil
}

// now returns the current time.
func (p *Packer) now() *timestamppb.Timestamp {
	if p.Now == nil {
		return timestamppb.Now()
	}

	return timestamppb.New(p.Now())
}

// generateID generates a new message ID.
func (p *Packer) generateID() *uuidpb.UUID {
	if p.GenerateID != nil {
		return p.GenerateID()
	}

	return uuidpb.Generate()
}

// PackCommandOption is an option that modifies the behavior of
// [Packer.PackCommand].
type PackCommandOption interface {
	applyPackCommandOption(*envelopepb.Envelope)
}

// PackEffectsOption is an option that modifies the behavior of
// [Packer.PackEffects].
type PackEffectsOption interface {
	applyPackEffectsOption(*envelopepb.Header)
}

// PackEffectCommandOption is an option that modifies the behavior of
// [EffectPacker.PackCommand].
type PackEffectCommandOption interface {
	applyPackEffectCommandOption(*envelopepb.Body)
}

// PackEffectEventOption is an option that modifies the behavior of
// [EffectPacker.PackEvent].
type PackEffectEventOption interface {
	applyPackEffectEventOption(*envelopepb.Body)
}

// PackEffectDeadlineOption is an option that modifies the behavior of
// [EffectPacker.PackDeadline].
type PackEffectDeadlineOption interface {
	applyPackEffectDeadlineOption(*envelopepb.Body)
}

type (
	packEffectsOption            func(*envelopepb.Header)
	packCommandOptionFunc        func(*envelopepb.Body)
	packEffectDeadlineOptionFunc func(*envelopepb.Body)
	universalOption              struct {
		applyToBodyFunc   func(*envelopepb.Body)
		applyToHeaderFunc func(*envelopepb.Header)
	}
)

func (o packEffectsOption) applyPackEffectsOption(header *envelopepb.Header)               { o(header) }
func (o packCommandOptionFunc) applyPackCommandOption(env *envelopepb.Envelope)            { o(env.GetBody()) }
func (o packEffectDeadlineOptionFunc) applyPackEffectDeadlineOption(body *envelopepb.Body) { o(body) }
func (o universalOption) applyPackCommandOption(env *envelopepb.Envelope) {
	o.applyToBodyFunc(env.GetBody())
}
func (o universalOption) applyPackEffectCommandOption(body *envelopepb.Body) { o.applyToBodyFunc(body) }
func (o universalOption) applyPackEffectEventOption(body *envelopepb.Body)   { o.applyToBodyFunc(body) }
func (o universalOption) applyPackEffectDeadlineOption(body *envelopepb.Body) {
	o.applyToBodyFunc(body)
}
func (o universalOption) applyPackEffectsOption(header *envelopepb.Header) {
	o.applyToHeaderFunc(header)
}

// WithIdempotencyKey sets the idempotency key of a command packed via
// [Packer.PackCommand].
func WithIdempotencyKey(key string) PackCommandOption {
	return packCommandOptionFunc(
		func(body *envelopepb.Body) {
			body.SetIdempotencyKey(key)
		},
	)
}

// WithInstanceID sets the aggregate or process instance ID that is the source
// of messages packed via [Packer.PackEffects].
func WithInstanceID(id string) PackEffectsOption {
	return packEffectsOption(
		func(header *envelopepb.Header) {
			header.GetSource().SetInstanceId(id)
		},
	)
}

// WithScheduledFor sets the time at which a deadline is reached when packed
// via [EffectPacker.PackDeadline].
func WithScheduledFor(t time.Time) PackEffectDeadlineOption {
	return packEffectDeadlineOptionFunc(
		func(body *envelopepb.Body) {
			body.SetScheduledFor(timestamppb.New(t))
		},
	)
}

// WithExtension adds x to the envelope's extensions.
//
// Extensions apply only to the envelope being packed; they are not inherited
// by downstream messages in the causal chain.
func WithExtension(x proto.Message) interface {
	PackCommandOption
	PackEffectsOption
	PackEffectCommandOption
	PackEffectEventOption
	PackEffectDeadlineOption
} {
	return universalOption{
		applyToBodyFunc: func(body *envelopepb.Body) {
			envelopepb.SetExtension(body, x)
		},
		applyToHeaderFunc: func(header *envelopepb.Header) {
			envelopepb.SetExtension(header, x)
		},
	}
}

// WithBaggage adds x to the envelope's baggage.
//
// Baggage applies to the envelope being packed and is inherited by downstream
// messages in the causal chain.
func WithBaggage(x proto.Message) interface {
	PackCommandOption
	PackEffectsOption
	PackEffectCommandOption
	PackEffectEventOption
	PackEffectDeadlineOption
} {
	return universalOption{
		applyToBodyFunc: func(body *envelopepb.Body) {
			envelopepb.SetBaggage(body, x)
		},
		applyToHeaderFunc: func(header *envelopepb.Header) {
			envelopepb.SetBaggage(header, x)
		},
	}
}

// flattenAnyValues merges two slices of [*anypb.Any] values from a
// [envelopepb.Header] and [envelopepb.Body] into a single slice.
//
// Later values override earlier values with the same type URL, so body values
// override header values and the last repeated value in either location wins.
func flattenAnyValues(header, body []*anypb.Any) []*anypb.Any {
	total := len(header) + len(body)
	if total == 0 {
		return nil
	}

	result := make([]*anypb.Any, total)
	start := total

	isSeen := func(v *anypb.Any) bool {
		for _, x := range result[start:] {
			if x.GetTypeUrl() == v.GetTypeUrl() {
				return true
			}
		}

		return false
	}

	appendLastWins := func(values []*anypb.Any) {
		for _, v := range slices.Backward(values) {
			if !isSeen(v) {
				start--
				result[start] = v
			}
		}
	}

	appendLastWins(body)
	appendLastWins(header)

	return result[start:]
}
