package envelopepb_test

import (
	"testing"
	"time"

	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	. "github.com/dogmatiq/enginekit/internal/test"
	. "github.com/dogmatiq/enginekit/protobuf/envelopepb"
	"github.com/dogmatiq/enginekit/protobuf/identitypb"
	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
	anypb "google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/timestamppb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

func TestPacker_CausedBy(t *testing.T) {
	t.Run("it panics if the handler is nil", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		cause := packer.PackCommand(CommandA1)

		ExpectPanic(
			t,
			"handler must not be nil",
			func() {
				packer.PackEffects(cause, nil)
			},
		)
	})

	t.Run("it panics if the cause is nil", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		ExpectPanic(
			t,
			"cause must not be nil",
			func() {
				packer.PackEffects(nil, handler)
			},
		)
	})

	t.Run("it panics if the cause envelope is invalid", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		ExpectPanic(
			t,
			"invalid cause envelope: invalid header: must not be nil",
			func() {
				packer.PackEffects(&Envelope{}, handler)
			},
		)
	})

	t.Run("it snapshots the packer state", func(t *testing.T) {
		causeID := uuidpb.Generate()
		packedID := uuidpb.Generate()
		now := time.Now()

		ids := []*uuidpb.UUID{causeID, packedID}
		site := identitypb.
			NewIdentityBuilder().
			WithName("site").
			WithKey(uuidpb.Generate()).
			Build()
		application := identitypb.
			NewIdentityBuilder().
			WithName("app").
			WithKey(uuidpb.Generate()).
			Build()
		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		packer := &Packer{
			Site:        site,
			Application: application,
			GenerateID: func() *uuidpb.UUID {
				id := ids[0]
				ids = ids[1:]
				return id
			},
			Now: func() time.Time {
				return now
			},
		}

		cause := packer.PackCommand(CommandA1)
		ep := packer.PackEffects(cause, handler)

		packer.Site = identitypb.NewIdentityBuilder().WithName("other-site").WithKey(uuidpb.Generate()).Build()
		packer.Application = identitypb.NewIdentityBuilder().WithName("other-app").WithKey(uuidpb.Generate()).Build()
		packer.GenerateID = func() *uuidpb.UUID {
			return uuidpb.Generate()
		}
		packer.Now = func() time.Time {
			return now.Add(24 * time.Hour)
		}

		ep.PackCommand(CommandA2)

		got, ok := ep.Seal()
		if !ok {
			t.Fatal("expected a multi-envelope")
		}

		if got == nil {
			t.Fatal("expected a non-nil multi-envelope")
		}

		if !got.GetHeader().GetSource().GetSite().Equal(site) {
			t.Fatalf("unexpected site: got %s, want %s", got.GetHeader().GetSource().GetSite(), site)
		}

		if !got.GetHeader().GetSource().GetApplication().Equal(application) {
			t.Fatalf("unexpected application: got %s, want %s", got.GetHeader().GetSource().GetApplication(), application)
		}

		if !got.GetHeader().GetSource().GetHandler().Equal(handler) {
			t.Fatalf("unexpected handler: got %s, want %s", got.GetHeader().GetSource().GetHandler(), handler)
		}

		if !got.GetBodies()[0].GetMessageId().Equal(packedID) {
			t.Fatalf("unexpected packed message ID: got %s, want %s", got.GetBodies()[0].GetMessageId(), packedID)
		}

		if !got.GetBodies()[0].GetCreatedAt().AsTime().Equal(now) {
			t.Fatalf("unexpected created-at: got %s, want %s", got.GetBodies()[0].GetCreatedAt().AsTime(), now)
		}
	})

	t.Run("it applies effect packer options to the shared source", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		handlerA := identitypb.
			NewIdentityBuilder().
			WithName("handler-a").
			WithKey(uuidpb.Generate()).
			Build()
		handlerB := identitypb.
			NewIdentityBuilder().
			WithName("handler-b").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)

		left := packer.PackEffects(
			cause,
			handlerA,
			WithInstanceID("instance-a"),
		)
		left.PackDeadline(DeadlineA1, WithScheduledFor(time.Now().Add(time.Hour)))

		right := packer.PackEffects(
			cause,
			handlerB,
			WithInstanceID("instance-b"),
		)
		right.PackDeadline(DeadlineA2, WithScheduledFor(time.Now().Add(2*time.Hour)))

		leftEnv, ok := left.Seal()
		if !ok {
			t.Fatal("expected left multi-envelope")
		}

		rightEnv, ok := right.Seal()
		if !ok {
			t.Fatal("expected right multi-envelope")
		}

		if !leftEnv.GetHeader().GetSource().GetHandler().Equal(handlerA) {
			t.Fatalf("unexpected left handler: got %s, want %s", leftEnv.GetHeader().GetSource().GetHandler(), handlerA)
		}

		if leftEnv.GetHeader().GetSource().GetInstanceId() != "instance-a" {
			t.Fatalf("unexpected left instance ID: got %q, want %q", leftEnv.GetHeader().GetSource().GetInstanceId(), "instance-a")
		}

		leftScheduledFor := leftEnv.GetBodies()[0].GetScheduledFor().AsTime()
		if leftScheduledFor.IsZero() {
			t.Fatal("expected left scheduled-for time")
		}

		if !rightEnv.GetHeader().GetSource().GetHandler().Equal(handlerB) {
			t.Fatalf("unexpected right handler: got %s, want %s", rightEnv.GetHeader().GetSource().GetHandler(), handlerB)
		}

		if rightEnv.GetHeader().GetSource().GetInstanceId() != "instance-b" {
			t.Fatalf("unexpected right instance ID: got %q, want %q", rightEnv.GetHeader().GetSource().GetInstanceId(), "instance-b")
		}

		rightScheduledFor := rightEnv.GetBodies()[0].GetScheduledFor().AsTime()
		if rightScheduledFor.IsZero() {
			t.Fatal("expected right scheduled-for time")
		}
	})

	t.Run("it applies extension and baggage options to the header", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		extension := wrapperspb.String("extension")
		wantExtension, err := anypb.New(extension)
		if err != nil {
			t.Fatal(err)
		}

		baggage := wrapperspb.String("baggage")
		wantBaggage, err := anypb.New(baggage)
		if err != nil {
			t.Fatal(err)
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)
		ep := packer.PackEffects(
			cause,
			handler,
			WithExtension(extension),
			WithBaggage(baggage),
		)
		ep.PackCommand(CommandA2)

		got, ok := ep.Seal()
		if !ok {
			t.Fatal("expected a multi-envelope")
		}

		Expect(
			t,
			"unexpected header extensions",
			got.GetHeader().GetExtensions(),
			[]*anypb.Any{wantExtension},
		)

		Expect(
			t,
			"unexpected header baggage",
			got.GetHeader().GetBaggage(),
			[]*anypb.Any{wantBaggage},
		)

		if got.GetBodies()[0].GetExtensions() != nil || got.GetBodies()[0].GetBaggage() != nil {
			t.Fatalf(
				"unexpected body extension state: got extensions %#v, baggage %#v, want nil",
				got.GetBodies()[0].GetExtensions(),
				got.GetBodies()[0].GetBaggage(),
			)
		}
	})

	t.Run("it keeps only the last baggage value for a type URL when propagating from the cause", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)
		cause.GetHeader().SetBaggage([]*anypb.Any{
			{
				TypeUrl: "type.googleapis.com/example.BaggageA",
				Value:   []byte("header-a-1"),
			},
			{
				TypeUrl: "type.googleapis.com/example.BaggageA",
				Value:   []byte("header-a-2"),
			},
			{
				TypeUrl: "type.googleapis.com/example.BaggageB",
				Value:   []byte("header-b"),
			},
		})

		cause.GetBody().SetBaggage([]*anypb.Any{
			{
				TypeUrl: "type.googleapis.com/example.BaggageB",
				Value:   []byte("body-b-1"),
			},
			{
				TypeUrl: "type.googleapis.com/example.BaggageB",
				Value:   []byte("body-b-2"),
			},
			{
				TypeUrl: "type.googleapis.com/example.BaggageC",
				Value:   []byte("body-c"),
			},
		})

		ep := packer.PackEffects(cause, handler)
		ep.PackCommand(CommandA2)

		got, ok := ep.Seal()
		if !ok {
			t.Fatal("expected a multi-envelope")
		}

		Expect(
			t,
			"unexpected propagated baggage",
			got.GetHeader().GetBaggage(),
			[]*anypb.Any{
				{
					TypeUrl: "type.googleapis.com/example.BaggageA",
					Value:   []byte("header-a-2"),
				},
				{
					TypeUrl: "type.googleapis.com/example.BaggageB",
					Value:   []byte("body-b-2"),
				},
				{
					TypeUrl: "type.googleapis.com/example.BaggageC",
					Value:   []byte("body-c"),
				},
			},
		)
	})

	t.Run("it propagates baggage but not extensions from the cause", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)
		cause.GetHeader().SetExtensions([]*anypb.Any{
			{
				TypeUrl: "type.googleapis.com/example.ExtensionA",
				Value:   []byte("header-a"),
			},
		})

		cause.GetHeader().SetBaggage([]*anypb.Any{
			{
				TypeUrl: "type.googleapis.com/example.BaggageA",
				Value:   []byte("header-a"),
			},
		})

		cause.GetBody().SetExtensions([]*anypb.Any{
			{
				TypeUrl: "type.googleapis.com/example.ExtensionB",
				Value:   []byte("body-b"),
			},
		})

		cause.GetBody().SetBaggage([]*anypb.Any{
			{
				TypeUrl: "type.googleapis.com/example.BaggageB",
				Value:   []byte("body-b"),
			},
		})

		ep := packer.PackEffects(cause, handler)
		ep.PackCommand(CommandA2)

		got, ok := ep.Seal()
		if !ok {
			t.Fatal("expected a multi-envelope")
		}

		if got.GetHeader().GetExtensions() != nil {
			t.Fatalf("unexpected header extensions: got %#v, want nil", got.GetHeader().GetExtensions())
		}

		Expect(
			t,
			"unexpected header baggage",
			got.GetHeader().GetBaggage(),
			[]*anypb.Any{
				{
					TypeUrl: "type.googleapis.com/example.BaggageA",
					Value:   []byte("header-a"),
				},
				{
					TypeUrl: "type.googleapis.com/example.BaggageB",
					Value:   []byte("body-b"),
				},
			},
		)

		if got.GetBodies()[0].GetExtensions() != nil || got.GetBodies()[0].GetBaggage() != nil {
			t.Fatalf(
				"unexpected body state: got extensions %#v, baggage %#v, want nil",
				got.GetBodies()[0].GetExtensions(),
				got.GetBodies()[0].GetBaggage(),
			)
		}
	})
}

func TestEffectPacker_Pack(t *testing.T) {
	t.Run("it panics if the body is invalid", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)
		ep := packer.PackEffects(cause, handler)

		ExpectPanic(
			t,
			"invalid body: invalid scheduled-for time: must not be specified without a source handler and instance ID",
			func() {
				ep.PackDeadline(DeadlineA1, WithScheduledFor(time.Now().Add(time.Hour)))
			},
		)
	})

	t.Run("it applies baggage options to the body", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		baggage := wrapperspb.String("baggage")
		want, err := anypb.New(baggage)
		if err != nil {
			t.Fatal(err)
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)
		ep := packer.PackEffects(cause, handler)
		ep.PackCommand(CommandA2, WithBaggage(baggage))

		got, ok := ep.Seal()
		if !ok {
			t.Fatal("expected a multi-envelope")
		}

		Expect(
			t,
			"unexpected baggage values",
			got.GetBodies()[0].GetBaggage(),
			[]*anypb.Any{want},
		)
	})

	t.Run("func PackCommand()", func(t *testing.T) {
		t.Run("it returns the expected envelope", func(t *testing.T) {
			id0 := uuidpb.Generate()
			id1 := uuidpb.Generate()
			now := time.Now()

			ids := []*uuidpb.UUID{id0, id1}
			site := identitypb.
				NewIdentityBuilder().
				WithName("site").
				WithKey(uuidpb.Generate()).
				Build()
			application := identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build()
			handler := identitypb.
				NewIdentityBuilder().
				WithName("handler").
				WithKey(uuidpb.Generate()).
				Build()

			packer := &Packer{
				Site:        site,
				Application: application,
				GenerateID: func() *uuidpb.UUID {
					id := ids[0]
					ids = ids[1:]
					return id
				},
				Now: func() time.Time {
					return now
				},
			}

			cause := packer.PackCommand(CommandA1)
			ep := packer.PackEffects(cause, handler)
			got := ep.PackCommand(CommandA2)

			want := NewEnvelopeBuilder().
				WithHeader(
					NewHeaderBuilder().
						WithCausationId(cause.GetBody().GetMessageId()).
						WithCorrelationId(cause.GetHeader().GetCorrelationId()).
						WithSource(NewSourceBuilder().
							WithSite(site).
							WithApplication(application).
							WithHandler(handler).
							Build()).
						Build(),
				).
				WithBody(
					NewBodyBuilder().
						WithMessageId(id1).
						WithCreatedAt(timestamppb.New(now)).
						WithMessage(NewMessageBuilder().
							WithDescription(`command(stubs.TypeA:A2, valid)`).
							WithTypeId(uuidpb.MustParse(MessageTypeID[*CommandStub[TypeA]]())).
							WithData([]byte(`{"content":"A2"}`)).
							Build()).
						Build(),
				).
				Build()

			Expect(
				t,
				"unexpected envelope",
				got,
				want,
			)
		})
	})

	t.Run("func PackEvent()", func(t *testing.T) {
		t.Run("it returns the expected envelope", func(t *testing.T) {
			id0 := uuidpb.Generate()
			id1 := uuidpb.Generate()
			now := time.Now()

			ids := []*uuidpb.UUID{id0, id1}
			site := identitypb.
				NewIdentityBuilder().
				WithName("site").
				WithKey(uuidpb.Generate()).
				Build()
			application := identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build()
			handler := identitypb.
				NewIdentityBuilder().
				WithName("handler").
				WithKey(uuidpb.Generate()).
				Build()

			packer := &Packer{
				Site:        site,
				Application: application,
				GenerateID: func() *uuidpb.UUID {
					id := ids[0]
					ids = ids[1:]
					return id
				},
				Now: func() time.Time {
					return now
				},
			}

			cause := packer.PackCommand(CommandA1)
			ep := packer.PackEffects(cause, handler)
			got := ep.PackEvent(EventA1)

			want := NewEnvelopeBuilder().
				WithHeader(
					NewHeaderBuilder().
						WithCausationId(cause.GetBody().GetMessageId()).
						WithCorrelationId(cause.GetHeader().GetCorrelationId()).
						WithSource(NewSourceBuilder().
							WithSite(site).
							WithApplication(application).
							WithHandler(handler).
							Build()).
						Build(),
				).
				WithBody(
					NewBodyBuilder().
						WithMessageId(id1).
						WithCreatedAt(timestamppb.New(now)).
						WithMessage(NewMessageBuilder().
							WithDescription(`event(stubs.TypeA:A1, valid)`).
							WithTypeId(uuidpb.MustParse(MessageTypeID[*EventStub[TypeA]]())).
							WithData([]byte(`{"content":"A1"}`)).
							Build()).
						Build(),
				).
				Build()

			Expect(
				t,
				"unexpected envelope",
				got,
				want,
			)
		})
	})

	t.Run("func PackDeadline()", func(t *testing.T) {
		t.Run("it returns the expected envelope", func(t *testing.T) {
			id0 := uuidpb.Generate()
			id1 := uuidpb.Generate()
			now := time.Now()
			scheduledFor := now.Add(time.Hour)

			ids := []*uuidpb.UUID{id0, id1}
			site := identitypb.
				NewIdentityBuilder().
				WithName("site").
				WithKey(uuidpb.Generate()).
				Build()
			application := identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build()
			handler := identitypb.
				NewIdentityBuilder().
				WithName("handler").
				WithKey(uuidpb.Generate()).
				Build()

			packer := &Packer{
				Site:        site,
				Application: application,
				GenerateID: func() *uuidpb.UUID {
					id := ids[0]
					ids = ids[1:]
					return id
				},
				Now: func() time.Time {
					return now
				},
			}

			cause := packer.PackCommand(CommandA1)
			ep := packer.PackEffects(cause, handler, WithInstanceID("instance"))
			got := ep.PackDeadline(DeadlineA1, WithScheduledFor(scheduledFor))

			want := NewEnvelopeBuilder().
				WithHeader(
					NewHeaderBuilder().
						WithCausationId(cause.GetBody().GetMessageId()).
						WithCorrelationId(cause.GetHeader().GetCorrelationId()).
						WithSource(NewSourceBuilder().
							WithSite(site).
							WithApplication(application).
							WithHandler(handler).
							WithInstanceId("instance").
							Build()).
						Build(),
				).
				WithBody(
					NewBodyBuilder().
						WithMessageId(id1).
						WithCreatedAt(timestamppb.New(now)).
						WithScheduledFor(timestamppb.New(scheduledFor)).
						WithMessage(NewMessageBuilder().
							WithDescription(`deadline(stubs.TypeA:A1, valid)`).
							WithTypeId(uuidpb.MustParse(MessageTypeID[*DeadlineStub[TypeA]]())).
							WithData([]byte(`{"content":"A1"}`)).
							Build()).
						Build(),
				).
				Build()

			Expect(
				t,
				"unexpected envelope",
				got,
				want,
			)
		})
	})
}

func TestEffectPacker_Seal(t *testing.T) {
	t.Run("it returns the packed messages in insertion order", func(t *testing.T) {
		id0 := uuidpb.Generate()
		id1 := uuidpb.Generate()
		id2 := uuidpb.Generate()
		now := time.Now()

		ids := []*uuidpb.UUID{id0, id1, id2}
		packer := &Packer{
			Site: identitypb.
				NewIdentityBuilder().
				WithName("site").
				WithKey(uuidpb.Generate()).
				Build(),
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
			GenerateID: func() *uuidpb.UUID {
				id := ids[0]
				ids = ids[1:]
				return id
			},
			Now: func() time.Time {
				return now
			},
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)

		ep := packer.PackEffects(cause, handler)
		ep.PackCommand(CommandA1)
		ep.PackCommand(CommandA2)

		got, ok := ep.Seal()
		if !ok {
			t.Fatal("expected a multi-envelope")
		}

		if got == nil {
			t.Fatal("expected a non-nil multi-envelope")
		}

		if err := got.Validate(); err != nil {
			t.Fatalf("effect packer produced an invalid envelope: %v", err)
		}

		want := NewMultiEnvelopeBuilder().
			WithHeader(
				NewHeaderBuilder().
					WithCausationId(cause.GetBody().GetMessageId()).
					WithCorrelationId(cause.GetHeader().GetCorrelationId()).
					WithSource(NewSourceBuilder().
						WithSite(packer.Site).
						WithApplication(packer.Application).
						WithHandler(handler).
						Build()).
					Build(),
			).
			WithBodies([]*Body{
				NewBodyBuilder().
					WithMessageId(id1).
					WithCreatedAt(timestamppb.New(now)).
					WithMessage(NewMessageBuilder().
						WithDescription(`command(stubs.TypeA:A1, valid)`).
						WithTypeId(uuidpb.MustParse(MessageTypeID[*CommandStub[TypeA]]())).
						WithData([]byte(`{"content":"A1"}`)).
						Build()).
					Build(),
				NewBodyBuilder().
					WithMessageId(id2).
					WithCreatedAt(timestamppb.New(now)).
					WithMessage(NewMessageBuilder().
						WithDescription(`command(stubs.TypeA:A2, valid)`).
						WithTypeId(uuidpb.MustParse(MessageTypeID[*CommandStub[TypeA]]())).
						WithData([]byte(`{"content":"A2"}`)).
						Build()).
					Build(),
			}).
			Build()

		Expect(
			t,
			"unexpected multi-envelope",
			got,
			want,
		)
	})

	t.Run("it returns no envelope when empty", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)
		got, ok := packer.PackEffects(cause, handler).Seal()

		if ok {
			t.Fatal("expected no multi-envelope")
		}

		if got != nil {
			t.Fatalf("unexpected multi-envelope: got %#v, want nil", got)
		}
	})

	t.Run("it panics after sealing", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		handler := identitypb.
			NewIdentityBuilder().
			WithName("handler").
			WithKey(uuidpb.Generate()).
			Build()

		cause := packer.PackCommand(CommandA1)

		t.Run("after empty seal", func(t *testing.T) {
			ep := packer.PackEffects(cause, handler)
			_, _ = ep.Seal()

			ExpectPanic(
				t,
				"already sealed",
				func() {
					ep.PackCommand(CommandA1)
				},
			)

			ExpectPanic(
				t,
				"already sealed",
				func() {
					ep.Seal()
				},
			)
		})

		t.Run("after non-empty seal", func(t *testing.T) {
			ep := packer.PackEffects(cause, handler)
			ep.PackCommand(CommandA1)
			_, _ = ep.Seal()

			ExpectPanic(
				t,
				"already sealed",
				func() {
					ep.PackCommand(CommandA2)
				},
			)

			ExpectPanic(
				t,
				"already sealed",
				func() {
					ep.Seal()
				},
			)
		})
	})
}
