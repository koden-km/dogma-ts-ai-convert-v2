package messaginggrpc_test

import (
	"testing"

	"github.com/dogmatiq/protobuf/envelopepb"
	"github.com/dogmatiq/protobuf/messaginggrpc"
	"google.golang.org/protobuf/proto"
)

func TestEventStreamSegment_MultiEnvelopeRoundTrip(t *testing.T) {
	// Distinct bodies must survive transport within the same multi-envelope.
	first := envelopepb.NewBodyBuilder().WithIdempotencyKey("first").Build()
	second := envelopepb.NewBodyBuilder().WithIdempotencyKey("second").Build()
	third := envelopepb.NewBodyBuilder().WithIdempotencyKey("third").Build()
	segment := messaginggrpc.NewEventStreamSegmentBuilder().
		WithEnvelopes([]*envelopepb.MultiEnvelope{
			envelopepb.NewMultiEnvelopeBuilder().WithBodies([]*envelopepb.Body{first, second}).Build(),
			envelopepb.NewMultiEnvelopeBuilder().WithBodies([]*envelopepb.Body{third}).Build(),
		}).Build()

	data, err := proto.Marshal(segment)
	if err != nil {
		t.Fatal(err)
	}
	var got messaginggrpc.EventStreamSegment
	if err := proto.Unmarshal(data, &got); err != nil {
		t.Fatal(err)
	}
	if !proto.Equal(segment, &got) {
		t.Fatalf("multi-envelope boundaries, body count or order changed: %v", &got)
	}
}
