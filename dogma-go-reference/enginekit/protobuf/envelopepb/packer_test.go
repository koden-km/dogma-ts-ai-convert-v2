package envelopepb_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/dogmatiq/dogma"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	. "github.com/dogmatiq/enginekit/internal/test"
	. "github.com/dogmatiq/enginekit/protobuf/envelopepb"
	"github.com/dogmatiq/enginekit/protobuf/identitypb"
	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/timestamppb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

func TestPacker_PackAndUnpack(t *testing.T) {
	id := uuidpb.Generate()
	now := time.Now()

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
			return id
		},
		Now: func() time.Time {
			return now
		},
	}

	got := packer.PackCommand(CommandA1)

	if err := got.Validate(); err != nil {
		t.Fatalf("packer produced an invalid envelope: %v", err)
	}

	want := NewEnvelopeBuilder().
		WithHeader(
			NewHeaderBuilder().
				WithCausationId(id).
				WithCorrelationId(id).
				WithSource(NewSourceBuilder().
					WithSite(packer.Site).
					WithApplication(packer.Application).
					Build()).
				Build(),
		).
		WithBody(
			NewBodyBuilder().
				WithMessageId(id).
				WithCreatedAt(timestamppb.New(now)).
				WithMessage(NewMessageBuilder().
					WithDescription(`command(stubs.TypeA:A1, valid)`).
					WithTypeId(uuidpb.MustParse(MessageTypeID[*CommandStub[TypeA]]())).
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

	gotMessage, err := Unpack[dogma.Message](want)
	if err != nil {
		t.Fatal(err)
	}

	Expect(
		t,
		"unexpected message",
		gotMessage,
		dogma.Message(CommandA1),
	)

	t.Run("func PackCommand()", func(t *testing.T) {
		t.Run("it panics if passed an unregistered message", func(t *testing.T) {
			ExpectPanic(
				t,
				"*envelopepb_test.T is not a registered message type",
				func() {
					type T struct{ dogma.Command }
					packer.PackCommand(&T{})
				},
			)
		})

		t.Run("it panics if the message cannot be marshaled", func(t *testing.T) {
			ExpectPanic(
				t,
				"unable to marshal *envelopepb_test.T: json: unsupported type: func()",
				func() {
					type T struct{ CommandStub[func()] }
					dogma.RegisterCommand[*T]("622003a4-01a5-4c77-8a4c-cb36b51994e7")
					packer.PackCommand(&T{})
				},
			)
		})

		t.Run("it panics if the envelope is invalid", func(t *testing.T) {
			before := packer.Site
			packer.Site = &identitypb.Identity{} // invalid
			defer func() { packer.Site = before }()

			ExpectPanic(
				t,
				"invalid header: invalid source: invalid site (00000000-0000-0000-0000-000000000000 ?): invalid name: must be between 1 and 255 bytes",
				func() {
					packer.PackCommand(CommandA1)
				},
			)
		})
	})

	t.Run("func Unpack()", func(t *testing.T) {
		t.Run("it unpacks to the requested type", func(t *testing.T) {
			cases := []struct {
				Name    string
				Message dogma.Message
				Unpack  func(*Envelope) (dogma.Message, error)
			}{
				{
					"dogma.Message",
					CommandA1,
					func(env *Envelope) (dogma.Message, error) {
						return Unpack[dogma.Message](env)
					},
				},
				{
					"dogma.Command",
					CommandA1,
					func(env *Envelope) (dogma.Message, error) {
						return Unpack[dogma.Command](env)
					},
				},
				{
					"dogma.Event",
					EventA1,
					func(env *Envelope) (dogma.Message, error) {
						return Unpack[dogma.Event](env)
					},
				},
				{
					"dogma.Deadline",
					DeadlineA1,
					func(env *Envelope) (dogma.Message, error) {
						return Unpack[dogma.Deadline](env)
					},
				},
				{
					"concrete type",
					CommandA1,
					func(env *Envelope) (dogma.Message, error) {
						return Unpack[*CommandStub[TypeA]](env)
					},
				},
			}

			for _, c := range cases {
				t.Run(c.Name, func(t *testing.T) {
					mt, ok := dogma.RegisteredMessageTypeOf(c.Message)
					if !ok {
						t.Fatalf("%T is not a registered message type", c.Message)
					}

					data, err := c.Message.MarshalBinary()
					if err != nil {
						t.Fatal(err)
					}

					env := NewEnvelopeBuilder().
						WithBody(NewBodyBuilder().
							WithMessage(NewMessageBuilder().
								WithTypeId(uuidpb.MustParse(mt.ID())).
								WithDescription(c.Message.MessageDescription()).
								WithData(data).
								Build()).
							Build()).
						Build()

					if _, err := c.Unpack(env); err != nil {
						t.Fatal(err)
					}
				})
			}
		})

		t.Run("it returns an error if the message type is not registered", func(t *testing.T) {
			env := NewEnvelopeBuilder().
				WithBody(NewBodyBuilder().
					WithMessage(NewMessageBuilder().
						WithDescription("<description>").
						WithTypeId(uuidpb.MustParse("f1816a71-3593-4771-8d8b-327650571288")).
						WithData([]byte(`{"content":"A1"}`)).
						Build()).
					Build()).
				Build()

			want := "unable to unpack envelope as dogma.Message: f1816a71-3593-4771-8d8b-327650571288 is not a registered message type ID"

			if _, err := Unpack[dogma.Message](env); err == nil {
				t.Fatal("expected an error")
			} else if err.Error() != want {
				t.Fatalf("unexpected error: got %q, want %q", err, want)
			}
		})

		t.Run("it returns an error if the message cannot be unmarshaled", func(t *testing.T) {
			env := NewEnvelopeBuilder().
				WithBody(NewBodyBuilder().
					WithMessage(NewMessageBuilder().
						WithDescription("<description>").
						WithTypeId(uuidpb.MustParse(MessageTypeID[*CommandStub[TypeA]]())).
						WithData([]byte(`}`)).
						Build()).
					Build()).
				Build()

			want := fmt.Sprintf(
				"unable to unpack envelope as dogma.Message: unable to unmarshal %T: invalid character '}' looking for beginning of value",
				CommandA1,
			)

			if _, err := Unpack[dogma.Message](env); err == nil {
				t.Fatal("expected an error")
			} else if err.Error() != want {
				t.Fatalf("unexpected error: got %q, want %q", err, want)
			}
		})

		t.Run("it returns an error if the message is not the expected interface type", func(t *testing.T) {
			env := packer.PackCommand(CommandA1)

			want := fmt.Sprintf(
				"unable to unpack envelope as dogma.Event: message type %s is registered as %T",
				MessageTypeID[*CommandStub[TypeA]](),
				CommandA1,
			)

			if _, err := Unpack[dogma.Event](env); err == nil {
				t.Fatal("expected an error")
			} else if err.Error() != want {
				t.Fatalf("unexpected error: got %q, want %q", err, want)
			}
		})

		t.Run("it returns an error if the message is not the expected concrete type", func(t *testing.T) {
			env := packer.PackCommand(CommandA1)

			want := fmt.Sprintf(
				"unable to unpack envelope as %T: message type %s is registered as %T",
				(*CommandStub[TypeB])(nil),
				MessageTypeID[*CommandStub[TypeA]](),
				CommandA1,
			)

			if _, err := Unpack[*CommandStub[TypeB]](env); err == nil {
				t.Fatal("expected an error")
			} else if err.Error() != want {
				t.Fatalf("unexpected error: got %q, want %q", err, want)
			}
		})
	})
}
func TestWithIdempotencyKey(t *testing.T) {
	packer := &Packer{
		Application: identitypb.
			NewIdentityBuilder().
			WithName("app").
			WithKey(uuidpb.Generate()).
			Build(),
	}

	got := packer.PackCommand(CommandA1, WithIdempotencyKey("test-key"))

	if got.GetBody().GetIdempotencyKey() != "test-key" {
		t.Fatalf("unexpected idempotency key: got %q, want %q", got.GetBody().GetIdempotencyKey(), "test-key")
	}
}

func TestWithExtension(t *testing.T) {
	t.Run("it panics if x is nil", func(t *testing.T) {
		ExpectPanic(
			t,
			"value must not be nil",
			func() {
				WithExtension(nil)
			},
		)
	})

	t.Run("it panics if x is an empty any", func(t *testing.T) {
		ExpectPanic(
			t,
			"value must not be an empty google.protobuf.Any",
			func() {
				var x *anypb.Any
				WithExtension(x)
			},
		)

		ExpectPanic(
			t,
			"value must not be an empty google.protobuf.Any",
			func() {
				WithExtension(&anypb.Any{})
			},
		)
	})

	t.Run("it accepts empty serialized values", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		got := packer.PackCommand(CommandA1, WithExtension(wrapperspb.String("")))

		if len(got.GetBody().GetExtensions()) != 1 {
			t.Fatalf("unexpected extension count: got %d, want 1", len(got.GetBody().GetExtensions()))
		}

		if got.GetBody().GetExtensions()[0].GetTypeUrl() != "type.googleapis.com/google.protobuf.StringValue" {
			t.Fatalf(
				"unexpected extension type URL: got %q, want %q",
				got.GetBody().GetExtensions()[0].GetTypeUrl(),
				"type.googleapis.com/google.protobuf.StringValue",
			)
		}

		if len(got.GetBody().GetExtensions()[0].GetValue()) != 0 {
			t.Fatalf(
				"unexpected extension payload length: got %d, want 0",
				len(got.GetBody().GetExtensions()[0].GetValue()),
			)
		}
	})

	t.Run("it accepts typed nil messages", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		var value *wrapperspb.StringValue
		got := packer.PackCommand(CommandA1, WithExtension(value))

		if len(got.GetBody().GetExtensions()) != 1 {
			t.Fatalf("unexpected extension count: got %d, want 1", len(got.GetBody().GetExtensions()))
		}

		if got.GetBody().GetExtensions()[0].GetTypeUrl() != "type.googleapis.com/google.protobuf.StringValue" {
			t.Fatalf(
				"unexpected extension type URL: got %q, want %q",
				got.GetBody().GetExtensions()[0].GetTypeUrl(),
				"type.googleapis.com/google.protobuf.StringValue",
			)
		}

		if len(got.GetBody().GetExtensions()[0].GetValue()) != 0 {
			t.Fatalf(
				"unexpected extension payload length: got %d, want 0",
				len(got.GetBody().GetExtensions()[0].GetValue()),
			)
		}
	})

	t.Run("it adds x to the extensions", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		extension := wrapperspb.String("extension")
		want, err := anypb.New(extension)
		if err != nil {
			t.Fatal(err)
		}

		got := packer.PackCommand(CommandA1, WithExtension(extension))

		if got.GetHeader().GetExtensions() != nil {
			t.Fatalf("unexpected header extensions: got %#v, want nil", got.GetHeader().GetExtensions())
		}

		Expect(
			t,
			"unexpected extensions",
			got.GetBody().GetExtensions(),
			[]*anypb.Any{want},
		)
	})

	t.Run("it keeps only the last value for a type URL", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		want, err := anypb.New(wrapperspb.String("second"))
		if err != nil {
			t.Fatal(err)
		}

		got := packer.PackCommand(
			CommandA1,
			WithExtension(wrapperspb.String("first")),
			WithExtension(wrapperspb.String("second")),
		)

		Expect(
			t,
			"unexpected extensions",
			got.GetBody().GetExtensions(),
			[]*anypb.Any{want},
		)
	})

	t.Run("it replaces an existing value in place", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		wantString, err := anypb.New(wrapperspb.String("second"))
		if err != nil {
			t.Fatal(err)
		}

		wantInt, err := anypb.New(wrapperspb.Int64(42))
		if err != nil {
			t.Fatal(err)
		}

		got := packer.PackCommand(
			CommandA1,
			WithExtension(wrapperspb.String("first")),
			WithExtension(wrapperspb.Int64(42)),
			WithExtension(wrapperspb.String("second")),
		)

		Expect(
			t,
			"unexpected extensions",
			got.GetBody().GetExtensions(),
			[]*anypb.Any{wantString, wantInt},
		)
	})
}

func TestWithBaggage(t *testing.T) {
	t.Run("it panics if x is nil", func(t *testing.T) {
		ExpectPanic(
			t,
			"value must not be nil",
			func() {
				WithBaggage(nil)
			},
		)
	})

	t.Run("it panics if x is an empty any", func(t *testing.T) {
		ExpectPanic(
			t,
			"value must not be an empty google.protobuf.Any",
			func() {
				WithBaggage(&anypb.Any{})
			},
		)
	})

	t.Run("it adds x to the baggage", func(t *testing.T) {
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

		got := packer.PackCommand(CommandA1, WithBaggage(baggage))

		if got.GetHeader().GetBaggage() != nil {
			t.Fatalf("unexpected header baggage: got %#v, want nil", got.GetHeader().GetBaggage())
		}

		Expect(
			t,
			"unexpected baggage",
			got.GetBody().GetBaggage(),
			[]*anypb.Any{want},
		)
	})

	t.Run("it keeps only the last value for a type URL", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		want, err := anypb.New(wrapperspb.String("second"))
		if err != nil {
			t.Fatal(err)
		}

		got := packer.PackCommand(
			CommandA1,
			WithBaggage(wrapperspb.String("first")),
			WithBaggage(wrapperspb.String("second")),
		)

		Expect(
			t,
			"unexpected baggage",
			got.GetBody().GetBaggage(),
			[]*anypb.Any{want},
		)
	})

	t.Run("it replaces an existing value in place", func(t *testing.T) {
		packer := &Packer{
			Application: identitypb.
				NewIdentityBuilder().
				WithName("app").
				WithKey(uuidpb.Generate()).
				Build(),
		}

		wantString, err := anypb.New(wrapperspb.String("second"))
		if err != nil {
			t.Fatal(err)
		}

		wantInt, err := anypb.New(wrapperspb.Int64(42))
		if err != nil {
			t.Fatal(err)
		}

		got := packer.PackCommand(
			CommandA1,
			WithBaggage(wrapperspb.String("first")),
			WithBaggage(wrapperspb.Int64(42)),
			WithBaggage(wrapperspb.String("second")),
		)

		Expect(
			t,
			"unexpected baggage",
			got.GetBody().GetBaggage(),
			[]*anypb.Any{wantString, wantInt},
		)
	})
}
