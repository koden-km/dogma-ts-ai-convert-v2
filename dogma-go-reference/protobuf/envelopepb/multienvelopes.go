package envelopepb

import (
	"iter"

	"google.golang.org/protobuf/proto"
)

// AsMultiEnvelopes groups consecutive envelopes with equivalent headers into
// multi-envelopes, preserving message order. Header equivalence is the same as
// for [MultiEnvelope.TryAppendEnvelope], including unknown fields.
//
// The returned sequence is lazy. It reads one envelope ahead to find each group
// boundary, and stops reading when iteration stops. Empty input yields nothing.
// A group is emitted when the header changes or the input ends. All bodies
// in the current group are held in memory; an endless input with equivalent
// headers keeps growing that group without emitting it.
//
// Each output has a new body slice but shares its header and bodies with the
// input. Inputs are not modified and must not be mutated during iteration.
//
// If the bodies share a header that is already known, prefer accumulating them
// in a slice and constructing the multi-envelope with
// [MultiEnvelopeBuilder.WithHeader] and [MultiEnvelopeBuilder.WithBodies]. This
// avoids allocating temporary envelopes and comparing headers for each body.
//
// It panics during iteration if an envelope is nil or has no body. It does not
// otherwise validate envelopes or change their metadata.
func AsMultiEnvelopes(envelopes iter.Seq[*Envelope]) iter.Seq[*MultiEnvelope] {
	return func(yield func(*MultiEnvelope) bool) {
		var (
			header *Header
			bodies []*Body
		)

		for env := range envelopes {
			if env.GetBody() == nil {
				panic("envelope must have a body")
			}

			if len(bodies) != 0 && !proto.Equal(header, env.GetHeader()) {
				if !yield(
					NewMultiEnvelopeBuilder().
						WithHeader(header).
						WithBodies(bodies).
						Build(),
				) {
					return
				}

				bodies = nil
			}

			if len(bodies) == 0 {
				header = env.GetHeader()
			}

			// Keep the growing slice outside the protobuf message: SetBodies()
			// stores a pointer to its argument, allocating a slice header per call.
			bodies = append(bodies, env.GetBody())
		}

		if len(bodies) != 0 {
			yield(
				NewMultiEnvelopeBuilder().
					WithHeader(header).
					WithBodies(bodies).
					Build(),
			)
		}
	}
}
