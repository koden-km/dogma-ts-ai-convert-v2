package xrapid

import (
	"github.com/dogmatiq/enginekit/protobuf/envelopepb"
	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
	anypb "google.golang.org/protobuf/types/known/anypb"
	"pgregory.net/rapid"
)

// Envelope returns a generator of random [*envelopepb.Envelope] values.
//
// By design, the message type and data encoded within the envelope is not
// necessarily valid.
func Envelope() *rapid.Generator[*envelopepb.Envelope] {
	anyValue := rapid.Custom(
		func(t *rapid.T) *anypb.Any {
			return &anypb.Any{
				TypeUrl: rapid.StringN(1, -1, -1).Draw(t, "extension type URL"),
				Value:   rapid.SliceOf(rapid.Byte()).Draw(t, "extension value"),
			}
		},
	)

	return rapid.Custom(
		func(t *rapid.T) *envelopepb.Envelope {
			handler := Nillable(Identity()).Draw(t, "source handler")

			source := envelopepb.
				NewSourceBuilder().
				WithSite(Nillable(Identity()).Draw(t, "source site")).
				WithApplication(Identity().Draw(t, "source application")).
				WithHandler(handler).
				Build()

			body := envelopepb.
				NewBodyBuilder().
				WithMessageId(uuidpb.Generate()).
				WithCreatedAt(Timestamp().Draw(t, "created at")).
				WithMessage(
					envelopepb.
						NewMessageBuilder().
						WithDescription(rapid.StringN(1, -1, -1).Draw(t, "description")).
						WithTypeId(uuidpb.Generate()).
						WithData(rapid.SliceOf(rapid.Byte()).Draw(t, "data")).
						Build(),
				).
				WithExtensions(rapid.SliceOf(anyValue).Draw(t, "extensions")).
				WithBaggage(rapid.SliceOf(anyValue).Draw(t, "baggage")).
				Build()

			if handler != nil {
				instanceID := rapid.String().Draw(t, "source instance id")
				source.SetInstanceId(instanceID)
				if instanceID != "" {
					body.SetScheduledFor(Nillable(Timestamp()).Draw(t, "scheduled for"))
				}
			}

			env := envelopepb.
				NewEnvelopeBuilder().
				WithHeader(
					envelopepb.
						NewHeaderBuilder().
						WithCausationId(uuidpb.Generate()).
						WithCorrelationId(uuidpb.Generate()).
						WithSource(source).
						Build(),
				).
				WithBody(body).
				Build()

			if err := env.Validate(); err != nil {
				t.Fatalf("generated invalid envelope: %v", err)
			}

			return env
		},
	)
}
