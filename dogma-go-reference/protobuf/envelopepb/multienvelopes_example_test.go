package envelopepb_test

import (
	"fmt"
	"slices"

	. "github.com/dogmatiq/protobuf/envelopepb"
)

func ExampleAsMultiEnvelopes() {
	header := NewHeaderBuilder().
		WithSource(
			NewSourceBuilder().
				WithInstanceId("source").
				Build(),
		).
		Build()
	first := NewEnvelopeBuilder().
		WithHeader(header).
		WithBody(
			NewBodyBuilder().
				WithIdempotencyKey("first").
				Build(),
		).
		Build()
	second := NewEnvelopeBuilder().
		WithHeader(header).
		WithBody(
			NewBodyBuilder().
				WithIdempotencyKey("second").
				Build(),
		).
		Build()

	// Group envelopes that already exist, without cloning their metadata.
	for group := range AsMultiEnvelopes(slices.Values([]*Envelope{first, second})) {
		fmt.Println(len(group.GetBodies()))
	}

	// Output: 2
}

func ExampleMultiEnvelopeBuilder_WithBodies() {
	header := &Header{}

	// A packer already knows the shared header. Accumulate new bodies directly
	// and transfer the slice when sealing the batch; no Envelope wrappers or
	// per-body protobuf SetBodies() calls are needed.
	var bodies []*Body
	bodies = append(
		bodies,
		NewBodyBuilder().
			WithIdempotencyKey("first").
			Build(),
	)
	bodies = append(
		bodies,
		NewBodyBuilder().
			WithIdempotencyKey("second").
			Build(),
	)
	batch := NewMultiEnvelopeBuilder().
		WithHeader(header).
		WithBodies(bodies).
		Build()
	fmt.Println(len(batch.GetBodies()))
	// Output: 2
}
