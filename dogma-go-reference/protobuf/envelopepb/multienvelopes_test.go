package envelopepb_test

import (
	"encoding/json"
	"fmt"
	"os"
	"slices"
	"testing"

	. "github.com/dogmatiq/protobuf/envelopepb"
	"github.com/dogmatiq/protobuf/uuidpb"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

func TestAsMultiEnvelopesFixtures(t *testing.T) {
	var cases []struct {
		Name    string    `json:"name"`
		Headers []*string `json:"headers"`
		Sizes   []int     `json:"sizes"`
	}

	data, err := os.ReadFile("testdata/multienvelopes.json")

	if err != nil {
		t.Fatal(err)
	}

	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}

	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			var (
				input  []*Envelope
				before []*Envelope
			)

			for i, key := range c.Headers {
				env := NewEnvelopeBuilder().
					WithBody(
						NewBodyBuilder().
							WithIdempotencyKey(fmt.Sprint(i)).
							Build(),
					).
					Build()

				if key != nil {
					header := &Header{}

					if *key != "" {
						header.SetSource(
							NewSourceBuilder().
								WithInstanceId(*key).
								Build(),
						)
					}

					env.SetHeader(header)
				}

				input = append(input, env)
				before = append(before, proto.Clone(env).(*Envelope))
			}

			groups := slices.Collect(AsMultiEnvelopes(slices.Values(input)))

			if len(groups) != len(c.Sizes) {
				t.Fatalf("group count: got %d, want %d", len(groups), len(c.Sizes))
			}

			index := 0

			for i, group := range groups {
				if len(group.GetBodies()) != c.Sizes[i] {
					t.Fatalf("group %d: got %d bodies, want %d", i, len(group.GetBodies()), c.Sizes[i])
				}

				if group.GetHeader() != input[index].GetHeader() {
					t.Fatal("group does not share its first header")
				}

				for env := range group.All() {
					if !proto.Equal(env, before[index]) {
						t.Fatalf("message %d changed or reordered", index)
					}

					if env.GetBody() != input[index].GetBody() {
						t.Fatal("body not shared")
					}

					index++
				}
			}

			if index != len(input) {
				t.Fatal("messages lost")
			}

			for i, env := range input {
				if !proto.Equal(env, before[i]) {
					t.Fatal("input mutated")
				}
			}
		})
	}
}

func TestAsMultiEnvelopesHeaderContext(t *testing.T) {
	for _, c := range []struct {
		name   string
		change func(*Header)
	}{
		{"causation", func(h *Header) { h.SetCausationId(uuidpb.Generate()) }},
		{"correlation", func(h *Header) { h.SetCorrelationId(uuidpb.Generate()) }},
		{"source", func(h *Header) {
			h.SetSource(
				NewSourceBuilder().
					WithInstanceId("other").
					Build(),
			)
		}},
		{"extensions", func(h *Header) { h.SetExtensions([]*anypb.Any{{TypeUrl: "example.com/Unknown", Value: []byte{1}}}) }},
		{"baggage", func(h *Header) { h.SetBaggage([]*anypb.Any{{TypeUrl: "example.com/Unknown", Value: []byte{1}}}) }},
		{"unknown fields", func(h *Header) { h.ProtoReflect().SetUnknown([]byte{0x98, 0x06, 1}) }},
	} {
		t.Run(c.name, func(t *testing.T) {
			a := newEnvelope()
			b := proto.Clone(a).(*Envelope)
			c.change(b.GetHeader())
			input := []*Envelope{a, proto.Clone(a).(*Envelope), b, proto.Clone(b).(*Envelope)}
			before := make([]*Envelope, len(input))

			for i, env := range input {
				before[i] = proto.Clone(env).(*Envelope)
			}

			groups := slices.Collect(AsMultiEnvelopes(slices.Values(input)))

			if len(groups) != 2 || len(groups[0].GetBodies()) != 2 || len(groups[1].GetBodies()) != 2 {
				t.Fatal("different header context was combined or equivalent headers were split")
			}

			index := 0

			for _, group := range groups {
				for env := range group.All() {
					if !proto.Equal(env, before[index]) {
						t.Fatalf("message %d lost metadata", index)
					}

					index++
				}
			}
		})
	}
}

func TestAsMultiEnvelopesEarlyStop(t *testing.T) {
	input := []*Envelope{newEnvelope(), newEnvelope(), newEnvelope()}
	reads := 0
	closed := false
	source := func(yield func(*Envelope) bool) {
		defer func() { closed = true }()

		for _, env := range input {
			reads++

			if !yield(env) {
				return
			}
		}
	}

	groups := AsMultiEnvelopes(source)

	if reads != 0 {
		t.Fatal("source read before iteration")
	}

	for range groups {
		break
	}

	if reads != 2 || !closed {
		t.Fatalf("source not stopped after one lookahead: reads=%d, closed=%v", reads, closed)
	}
}

func TestAsMultiEnvelopesMissingBody(t *testing.T) {
	for _, env := range []*Envelope{nil, {}} {
		t.Run(fmt.Sprint(env == nil), func(t *testing.T) {
			defer func() {
				if recover() == nil {
					t.Error("missing body did not panic")
				}
			}()
			slices.Collect(AsMultiEnvelopes(slices.Values([]*Envelope{env})))
		})
	}
}
