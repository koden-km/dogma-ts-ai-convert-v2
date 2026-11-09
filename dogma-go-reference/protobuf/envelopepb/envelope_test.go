package envelopepb_test

import (
	"math"
	"strings"
	"testing"

	"github.com/dogmatiq/protobuf/envelopepb"
	. "github.com/dogmatiq/protobuf/envelopepb"
	identitypb "github.com/dogmatiq/protobuf/identitypb"
	. "github.com/dogmatiq/protobuf/internal/xtesting"
	uuidpb "github.com/dogmatiq/protobuf/uuidpb"
	"google.golang.org/protobuf/proto"
	anypb "google.golang.org/protobuf/types/known/anypb"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

func TestEnvelope_Validate(t *testing.T) {
	t.Parallel()

	t.Run("when the envelope is valid", func(t *testing.T) {
		t.Parallel()

		cases := []struct {
			Desc    string
			Subject *Envelope
		}{
			{
				"complete",
				newEnvelope(),
			},
			{
				"without source site",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().GetSource().SetSite(nil)
				}),
			},
			{
				"without source handler",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().GetSource().SetHandler(nil)
					e.GetHeader().GetSource().SetInstanceId("")
					e.GetBody().SetScheduledFor(nil)
				}),
			},
			{
				"without source instance ID",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().GetSource().SetInstanceId("")
					e.GetBody().SetScheduledFor(nil)
				}),
			},
			{
				"without extensions",
				newEnvelope(func(e *Envelope) {
					e.GetBody().SetExtensions(nil)
				}),
			},
			{
				"with empty extension payload",
				newEnvelope(func(e *Envelope) {
					e.GetBody().SetExtensions([]*anypb.Any{{
						TypeUrl: "type.googleapis.com/example.Extension",
					}})
				}),
			},
			{
				"with empty baggage payload",
				newEnvelope(func(e *Envelope) {
					e.GetBody().SetBaggage([]*anypb.Any{{
						TypeUrl: "type.googleapis.com/example.Baggage",
					}})
				}),
			},
			{
				"without data",
				newEnvelope(func(e *Envelope) {
					e.GetBody().GetMessage().SetData(nil)
				}),
			},
		}

		for _, c := range cases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				if err := c.Subject.Validate(); err != nil {
					t.Fatal(err)
				}
			})
		}
	})

	t.Run("when the envelope is invalid", func(t *testing.T) {
		t.Parallel()

		cases := []struct {
			Desc    string
			Subject *Envelope
			Expect  string
		}{
			{
				"empty",
				&Envelope{},
				"invalid header: must not be nil",
			},
			{
				"invalid message ID",
				newEnvelope(func(e *Envelope) {
					e.GetBody().SetMessageId(&uuidpb.UUID{})
				}),
				"invalid body: invalid message ID (00000000-0000-0000-0000-000000000000): UUID must use version 4 or 5",
			},
			{
				"invalid causation ID",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().SetCausationId(&uuidpb.UUID{})
				}),
				"invalid header: invalid causation ID (00000000-0000-0000-0000-000000000000): UUID must use version 4 or 5",
			},
			{
				"invalid correlation ID",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().SetCorrelationId(&uuidpb.UUID{})
				}),
				"invalid header: invalid correlation ID (00000000-0000-0000-0000-000000000000): UUID must use version 4 or 5",
			},
			{
				"invalid source site",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().GetSource().SetSite(&identitypb.Identity{})
				}),
				"invalid header: invalid source: invalid site (00000000-0000-0000-0000-000000000000 ?): invalid name: must be between 1 and 255 bytes",
			},
			{
				"invalid source application",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().GetSource().SetApplication(&identitypb.Identity{})
				}),
				"invalid header: invalid source: invalid application (00000000-0000-0000-0000-000000000000 ?): invalid name: must be between 1 and 255 bytes",
			},
			{
				"invalid source handler",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().GetSource().SetHandler(&identitypb.Identity{})
				}),
				"invalid header: invalid source: invalid handler (00000000-0000-0000-0000-000000000000 ?): invalid name: must be between 1 and 255 bytes",
			},
			{
				"source instance ID without source handler",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().GetSource().SetHandler(nil)
				}),
				"invalid header: invalid source: invalid instance ID: must not be specified without a handler",
			},
			{
				"scheduled-for time without source handler",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().GetSource().SetHandler(nil)
					e.GetHeader().GetSource().SetInstanceId("")
				}),
				"invalid body: invalid scheduled-for time: must not be specified without a source handler and instance ID",
			},
			{
				"invalid created-at time",
				newEnvelope(func(e *Envelope) {
					e.GetBody().SetCreatedAt(nil)
				}),
				"invalid body: invalid created-at time: proto: invalid nil Timestamp",
			},
			{
				"invalid scheduled-for time",
				newEnvelope(func(e *Envelope) {
					e.GetBody().SetScheduledFor(&timestamppb.Timestamp{
						Seconds: math.MaxInt64,
						Nanos:   math.MaxInt32,
					})
				}),
				"invalid body: invalid scheduled-for time: proto: timestamp (seconds:9223372036854775807 nanos:2147483647) after 9999-12-31",
			},
			{
				"invalid description",
				newEnvelope(func(e *Envelope) {
					e.GetBody().GetMessage().SetDescription("")
				}),
				"invalid body: invalid message: invalid description: must not be empty",
			},
			{
				"empty header extension",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().SetExtensions([]*anypb.Any{{}})
				}),
				"invalid header: invalid extensions at index 0: type URL must not be empty",
			},
			{
				"empty header baggage",
				newEnvelope(func(e *Envelope) {
					e.GetHeader().SetBaggage([]*anypb.Any{nil})
				}),
				"invalid header: invalid baggage at index 0: type URL must not be empty",
			},
			{
				"empty body extension",
				newEnvelope(func(e *Envelope) {
					e.GetBody().SetExtensions([]*anypb.Any{{}})
				}),
				"invalid body: invalid extensions at index 0: type URL must not be empty",
			},
			{
				"empty body baggage",
				newEnvelope(func(e *Envelope) {
					e.GetBody().SetBaggage([]*anypb.Any{{}})
				}),
				"invalid body: invalid baggage at index 0: type URL must not be empty",
			},
			{
				"without type ID",
				newEnvelope(func(e *Envelope) {
					e.GetBody().GetMessage().SetTypeId(nil)
				}),
				"invalid body: invalid message: invalid type ID (00000000-0000-0000-0000-000000000000): UUID must use version 4 or 5",
			},
		}

		for _, c := range cases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				err := c.Subject.Validate()
				if err == nil {
					t.Fatal("expected an error")
				}

				// defeat the protobuf's random injection of of whitespace into
				// error messages.
				actual := strings.ReplaceAll(err.Error(), "\u00a0", " ")
				actual = strings.ReplaceAll(actual, "  ", " ")

				if actual != c.Expect {
					t.Fatalf("got %q, want %q", err, c.Expect)
				}
			})
		}
	})
}

func TestHeader_Validate(t *testing.T) {
	t.Parallel()

	t.Run("it accepts a valid header", func(t *testing.T) {
		t.Parallel()

		if err := newEnvelope().GetHeader().Validate(); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("it rejects a nil header", func(t *testing.T) {
		t.Parallel()

		expectValidationError(t, (*Header)(nil).Validate(), "must not be nil")
	})

	t.Run("it rejects an invalid header", func(t *testing.T) {
		t.Parallel()

		h := newEnvelope().GetHeader()
		h.SetSource(nil)

		expectValidationError(t, h.Validate(), "invalid source: must not be nil")
	})
}

func TestBody_Validate(t *testing.T) {
	t.Parallel()

	t.Run("it accepts a valid body", func(t *testing.T) {
		t.Parallel()

		env := newEnvelope()

		if err := env.GetBody().Validate(env.GetHeader()); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("it rejects a nil body", func(t *testing.T) {
		t.Parallel()

		env := newEnvelope()

		expectValidationError(t, (*Body)(nil).Validate(env.GetHeader()), "must not be nil")
	})

	t.Run("it rejects an invalid body", func(t *testing.T) {
		t.Parallel()

		env := newEnvelope()
		env.GetBody().GetMessage().SetDescription("")

		expectValidationError(
			t,
			env.GetBody().Validate(env.GetHeader()),
			"invalid message: invalid description: must not be empty",
		)
	})

	t.Run("it rejects a scheduled-for time when the header has no instance ID", func(t *testing.T) {
		t.Parallel()

		env := newEnvelope()
		env.GetHeader().GetSource().SetInstanceId("")

		expectValidationError(
			t,
			env.GetBody().Validate(env.GetHeader()),
			"invalid scheduled-for time: must not be specified without a source handler and instance ID",
		)
	})
}

func TestMessage_Validate(t *testing.T) {
	t.Parallel()

	t.Run("it accepts a valid message", func(t *testing.T) {
		t.Parallel()

		if err := newEnvelope().GetBody().GetMessage().Validate(); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("it rejects a nil message", func(t *testing.T) {
		t.Parallel()

		expectValidationError(t, (*Message)(nil).Validate(), "must not be nil")
	})

	t.Run("it rejects an invalid message", func(t *testing.T) {
		t.Parallel()

		m := newEnvelope().GetBody().GetMessage()
		m.SetDescription("")

		expectValidationError(t, m.Validate(), "invalid description: must not be empty")
	})
}

// expectValidationError fails the test if err is nil or its message is not
// want.
func expectValidationError(t *testing.T, err error, want string) {
	t.Helper()

	if err == nil {
		t.Fatal("expected an error")
	}

	if err.Error() != want {
		t.Fatalf("got %q, want %q", err, want)
	}
}

func TestEnvelope_AsMultiEnvelope(t *testing.T) {
	t.Parallel()

	env := newEnvelope()
	multi := env.AsMultiEnvelope()

	Expect(t, "unexpected header", multi.GetHeader(), env.GetHeader())

	bodies := multi.GetBodies()
	Expect(t, "unexpected body count", len(bodies), 1)
	Expect(t, "unexpected body", bodies[0], env.GetBody())
}

func TestMultiEnvelope_All(t *testing.T) {
	t.Parallel()

	t.Run("it yields each body as a standalone envelope", func(t *testing.T) {
		t.Parallel()

		body1 := newEnvelope().GetBody()
		body2 := newEnvelope().GetBody()
		header := newEnvelope().GetHeader()

		multi := NewMultiEnvelopeBuilder().
			WithHeader(header).
			WithBodies([]*Body{body1, body2}).
			Build()

		var got []*Envelope
		for env := range multi.All() {
			got = append(got, env)
		}

		Expect(t, "unexpected envelope count", len(got), 2)
		Expect(t, "unexpected envelope[0] header", got[0].GetHeader(), header)
		Expect(t, "unexpected envelope[0] body", got[0].GetBody(), body1)
		Expect(t, "unexpected envelope[1] header", got[1].GetHeader(), header)
		Expect(t, "unexpected envelope[1] body", got[1].GetBody(), body2)
	})

	t.Run("it stops early when yield returns false", func(t *testing.T) {
		t.Parallel()

		body1 := newEnvelope().GetBody()
		body2 := newEnvelope().GetBody()

		multi := NewMultiEnvelopeBuilder().
			WithHeader(newEnvelope().GetHeader()).
			WithBodies([]*Body{body1, body2}).
			Build()

		var got []*Envelope
		for env := range multi.All() {
			got = append(got, env)
			break
		}

		Expect(t, "unexpected envelope count", len(got), 1)
		Expect(t, "unexpected envelope[0] body", got[0].GetBody(), body1)
	})

	t.Run("it yields nothing when there are no bodies", func(t *testing.T) {
		t.Parallel()

		multi := NewMultiEnvelopeBuilder().
			WithHeader(newEnvelope().GetHeader()).
			Build()

		var got []*Envelope
		for env := range multi.All() {
			got = append(got, env)
		}

		Expect(t, "unexpected envelope count", len(got), 0)
	})
}

func TestMultiEnvelope_AppendBodies(t *testing.T) {
	t.Parallel()

	t.Run("it appends bodies to the multi-envelope", func(t *testing.T) {
		t.Parallel()

		body1 := newEnvelope().GetBody()
		body2 := newEnvelope().GetBody()
		body3 := newEnvelope().GetBody()

		multi := NewMultiEnvelopeBuilder().
			WithHeader(newEnvelope().GetHeader()).
			WithBodies([]*Body{body1}).
			Build()

		multi.AppendBodies(body2, body3)

		got := multi.GetBodies()
		Expect(t, "unexpected body count", len(got), 3)
		Expect(t, "unexpected body[0]", got[0], body1)
		Expect(t, "unexpected body[1]", got[1], body2)
		Expect(t, "unexpected body[2]", got[2], body3)
	})

	t.Run("it appends to an empty multi-envelope", func(t *testing.T) {
		t.Parallel()

		body := newEnvelope().GetBody()

		multi := NewMultiEnvelopeBuilder().
			WithHeader(newEnvelope().GetHeader()).
			Build()

		multi.AppendBodies(body)

		got := multi.GetBodies()
		Expect(t, "unexpected body count", len(got), 1)
		Expect(t, "unexpected body[0]", got[0], body)
	})
}

func TestMultiEnvelope_TryAppendEnvelope(t *testing.T) {
	t.Parallel()

	t.Run("it appends when headers are equivalent", func(t *testing.T) {
		t.Parallel()

		header := newEnvelope().GetHeader()
		body1 := newEnvelope().GetBody()
		body2 := newEnvelope().GetBody()

		multi := NewMultiEnvelopeBuilder().
			WithHeader(header).
			WithBodies([]*Body{body1}).
			Build()

		env := NewEnvelopeBuilder().
			WithHeader(header).
			WithBody(body2).
			Build()

		ok := multi.TryAppendEnvelope(env)

		Expect(t, "unexpected result", ok, true)
		got := multi.GetBodies()
		Expect(t, "unexpected body count", len(got), 2)
		Expect(t, "unexpected body[0]", got[0], body1)
		Expect(t, "unexpected body[1]", got[1], body2)
	})

	t.Run("it returns false when headers differ", func(t *testing.T) {
		t.Parallel()

		body1 := newEnvelope().GetBody()
		body2 := newEnvelope().GetBody()

		multi := NewMultiEnvelopeBuilder().
			WithHeader(newEnvelope().GetHeader()).
			WithBodies([]*Body{body1}).
			Build()

		env := NewEnvelopeBuilder().
			WithHeader(newEnvelope().GetHeader()).
			WithBody(body2).
			Build()

		ok := multi.TryAppendEnvelope(env)

		Expect(t, "unexpected result", ok, false)
		got := multi.GetBodies()
		Expect(t, "unexpected body count", len(got), 1)
		Expect(t, "unexpected body[0]", got[0], body1)
	})
}

func TestWireCompatibility(t *testing.T) {
	t.Parallel()

	env := newEnvelope(func(e *Envelope) {
		e.GetHeader().SetExtensions([]*anypb.Any{
			{TypeUrl: "type.googleapis.com/example.ExtA", Value: []byte("header-a")},
		})
		e.GetHeader().SetBaggage([]*anypb.Any{
			{TypeUrl: "type.googleapis.com/example.BagA", Value: []byte("header-a")},
		})
		e.GetBody().SetExtensions([]*anypb.Any{
			{TypeUrl: "type.googleapis.com/example.ExtB", Value: []byte("body-b")},
		})
		e.GetBody().SetBaggage([]*anypb.Any{
			{TypeUrl: "type.googleapis.com/example.BagB", Value: []byte("body-b")},
		})
	})

	t.Run("envelope unmarshals as multi-envelope", func(t *testing.T) {
		t.Parallel()

		data, err := env.MarshalBinary()
		if err != nil {
			t.Fatal(err)
		}

		var got MultiEnvelope
		if err := got.UnmarshalBinary(data); err != nil {
			t.Fatal(err)
		}

		Expect(t, "unexpected header extensions", got.GetHeader().GetExtensions(), env.GetHeader().GetExtensions())
		Expect(t, "unexpected header baggage", got.GetHeader().GetBaggage(), env.GetHeader().GetBaggage())

		if len(got.GetBodies()) != 1 {
			t.Fatalf("unexpected body count: got %d, want 1", len(got.GetBodies()))
		}

		Expect(t, "unexpected body extensions", got.GetBodies()[0].GetExtensions(), env.GetBody().GetExtensions())
		Expect(t, "unexpected body baggage", got.GetBodies()[0].GetBaggage(), env.GetBody().GetBaggage())
	})

	t.Run("single-body multi-envelope unmarshals as envelope", func(t *testing.T) {
		t.Parallel()

		multi := NewMultiEnvelopeBuilder().
			WithHeader(env.GetHeader()).
			WithBodies([]*Body{env.GetBody()}).
			Build()

		data, err := multi.MarshalBinary()
		if err != nil {
			t.Fatal(err)
		}

		var got Envelope
		if err := got.UnmarshalBinary(data); err != nil {
			t.Fatal(err)
		}

		Expect(t, "unexpected header extensions", got.GetHeader().GetExtensions(), env.GetHeader().GetExtensions())
		Expect(t, "unexpected header baggage", got.GetHeader().GetBaggage(), env.GetHeader().GetBaggage())
		Expect(t, "unexpected body extensions", got.GetBody().GetExtensions(), env.GetBody().GetExtensions())
		Expect(t, "unexpected body baggage", got.GetBody().GetBaggage(), env.GetBody().GetBaggage())
	})
	t.Run("multiple bodies merge when decoded as a single envelope", func(t *testing.T) {
		t.Parallel()

		first := NewBodyBuilder().WithIdempotencyKey("first").Build()
		second := NewBodyBuilder().WithMessage(newEnvelope().GetBody().GetMessage()).Build()
		multi := NewMultiEnvelopeBuilder().WithBodies([]*Body{first, second}).Build()
		data, err := multi.MarshalBinary()
		if err != nil {
			t.Fatal(err)
		}

		var got Envelope
		if err := got.UnmarshalBinary(data); err != nil {
			t.Fatal(err)
		}
		Expect(t, "first body's key must survive the merge", got.GetBody().GetIdempotencyKey(), "first")
		Expect(t, "second body's message must survive the merge", got.GetBody().GetMessage(), second.GetMessage())
	})

}

func newEnvelope(modifiers ...func(*Envelope)) *envelopepb.Envelope {
	env := NewEnvelopeBuilder().
		WithHeader(
			NewHeaderBuilder().
				WithCausationId(uuidpb.Generate()).
				WithCorrelationId(uuidpb.Generate()).
				WithSource(NewSourceBuilder().
					WithSite(identitypb.New("<site-name>", uuidpb.Generate())).
					WithApplication(identitypb.New("<app-name>", uuidpb.Generate())).
					WithHandler(identitypb.New("<handler-name>", uuidpb.Generate())).
					WithInstanceId("<instance>").
					Build()).
				Build(),
		).
		WithBody(
			NewBodyBuilder().
				WithMessageId(uuidpb.Generate()).
				WithCreatedAt(timestamppb.Now()).
				WithScheduledFor(timestamppb.Now()).
				WithMessage(NewMessageBuilder().
					WithDescription("<description>").
					WithTypeId(uuidpb.Generate()).
					WithData([]byte("<data>")).
					Build(),
				).
				WithExtensions([]*anypb.Any{
					{
						TypeUrl: "type.googleapis.com/example.envelope.v1.Extension",
						Value:   []byte("<extension-value>"),
					},
				}).
				WithBaggage([]*anypb.Any{
					{
						TypeUrl: "type.googleapis.com/example.envelope.v1.Baggage",
						Value:   []byte("<baggage-value>"),
					},
				}).
				Build()).
		Build()

	for _, fn := range modifiers {
		fn(env)
	}

	return env
}

// newEmptyEnvelope returns an envelope with an empty header and body.
func newEmptyEnvelope() *Envelope {
	return NewEnvelopeBuilder().
		WithHeader(NewHeaderBuilder().Build()).
		WithBody(NewBodyBuilder().Build()).
		Build()
}

// mustMarshalAny returns m wrapped in an [anypb.Any].
func mustMarshalAny(t testing.TB, m proto.Message) *anypb.Any {
	t.Helper()

	a, err := anypb.New(m)
	if err != nil {
		t.Fatal(err)
	}

	return a
}
