package envelope

import (
	"fmt"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/protobuf/envelopepb"
	"github.com/dogmatiq/protobuf/identitypb"
	"github.com/dogmatiq/protobuf/uuidpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// An EffectPacker packs messages produced while handling a specific causal
// message into a [envelopepb.MultiEnvelope].
type EffectPacker struct {
	generateID func() *uuidpb.UUID
	now        func() *timestamppb.Timestamp
	header     *envelopepb.Header
	bodies     []*envelopepb.Body
	sealed     bool
}

// PackEffects returns an [EffectPacker] that packs messages produced by h while
// handling cause.
func (p *Packer) PackEffects(
	cause *envelopepb.Envelope,
	h *identitypb.Identity,
	options ...PackEffectsOption,
) *EffectPacker {
	if h == nil {
		panic("handler must not be nil")
	}

	if cause == nil {
		panic("cause must not be nil")
	}

	if err := cause.Validate(); err != nil {
		panic(fmt.Errorf("invalid cause envelope: %w", err))
	}

	generateID := p.GenerateID
	if generateID == nil {
		generateID = uuidpb.Generate
	}

	now := timestamppb.Now
	if p.Now != nil {
		nowTime := p.Now
		now = func() *timestamppb.Timestamp {
			return timestamppb.New(nowTime())
		}
	}

	header := envelopepb.NewHeaderBuilder().
		WithCausationId(cause.GetBody().GetMessageId()).
		WithCorrelationId(cause.GetHeader().GetCorrelationId()).
		WithSource(envelopepb.NewSourceBuilder().
			WithSite(p.Site).
			WithApplication(p.Application).
			WithHandler(h).
			Build()).
		WithBaggage(flattenAnyValues(
			cause.GetHeader().GetBaggage(),
			cause.GetBody().GetBaggage(),
		)).
		Build()

	for _, opt := range options {
		opt.applyPackEffectsOption(header)
	}

	if err := header.Validate(); err != nil {
		panic(fmt.Errorf("invalid header: %w", err))
	}

	return &EffectPacker{
		generateID: generateID,
		now:        now,
		header:     header,
	}
}

// PackCommand appends m to the multi-envelope under construction.
func (p *EffectPacker) PackCommand(m dogma.Command, options ...PackEffectCommandOption) *envelopepb.Envelope {
	return packEffectBody(p, m, PackEffectCommandOption.applyPackEffectCommandOption, options...)
}

// PackEvent appends m to the multi-envelope under construction.
func (p *EffectPacker) PackEvent(m dogma.Event, options ...PackEffectEventOption) *envelopepb.Envelope {
	return packEffectBody(p, m, PackEffectEventOption.applyPackEffectEventOption, options...)
}

// PackDeadline appends m to the multi-envelope under construction.
func (p *EffectPacker) PackDeadline(m dogma.Deadline, options ...PackEffectDeadlineOption) *envelopepb.Envelope {
	return packEffectBody(p, m, PackEffectDeadlineOption.applyPackEffectDeadlineOption, options...)
}

func packEffectBody[T any](
	p *EffectPacker,
	m dogma.Message,
	apply func(T, *envelopepb.Body),
	options ...T,
) *envelopepb.Envelope {
	p.mustNotBeSealed()

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

	body := envelopepb.NewBodyBuilder().
		WithMessageId(p.generateID()).
		WithMessage(
			envelopepb.NewMessageBuilder().
				WithTypeId(uuidpb.MustParse(mt.ID())).
				WithDescription(m.MessageDescription()).
				WithData(data).
				Build(),
		).
		Build()

	for _, opt := range options {
		apply(opt, body)
	}

	if !body.HasCreatedAt() {
		body.SetCreatedAt(p.now())
	}

	if err := body.Validate(p.header); err != nil {
		panic(fmt.Errorf("invalid body: %w", err))
	}

	p.bodies = append(p.bodies, body)

	return envelopepb.NewEnvelopeBuilder().
		WithHeader(p.header).
		WithBody(body).
		Build()
}

// Seal returns a [envelopepb.MultiEnvelope] containing all packed messages, or
// false if no messages were packed.
func (p *EffectPacker) Seal() (*envelopepb.MultiEnvelope, bool) {
	p.mustNotBeSealed()
	p.sealed = true

	if len(p.bodies) == 0 {
		return nil, false
	}

	return envelopepb.NewMultiEnvelopeBuilder().
		WithHeader(p.header).
		WithBodies(p.bodies).
		Build(), true
}

func (p *EffectPacker) mustNotBeSealed() {
	if p.sealed {
		panic("already sealed")
	}
}
