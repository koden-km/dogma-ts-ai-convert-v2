package envelopepb_test

import (
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"

	. "github.com/dogmatiq/protobuf/envelopepb"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

func TestMetadataLookupFixtures(t *testing.T) {
	type value struct {
		TypeURL string `json:"typeUrl"`
		Data    string `json:"data"`
	}
	var cases []struct {
		Name   string  `json:"name"`
		Header []value `json:"header"`
		Body   []value `json:"body"`
		Offset *uint64 `json:"offset"`
		Error  bool    `json:"error"`
	}
	data, err := os.ReadFile("testdata/lookup.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	values := func(input []value) []*anypb.Any {
		out := make([]*anypb.Any, len(input))
		for i, v := range input {
			data, err := hex.DecodeString(v.Data)
			if err != nil {
				t.Fatal(err)
			}
			out[i] = &anypb.Any{TypeUrl: v.TypeURL, Value: data}
		}
		return out
	}
	for _, baggage := range []bool{false, true} {
		name := "extensions"
		if baggage {
			name = "baggage"
		}
		t.Run(name, func(t *testing.T) {
			for _, c := range cases {
				t.Run(c.Name, func(t *testing.T) {
					env := &Envelope{}
					if c.Header != nil {
						h := &Header{}
						if baggage {
							h.SetBaggage(values(c.Header))
						} else {
							h.SetExtensions(values(c.Header))
						}
						env.SetHeader(h)
					}
					if c.Body != nil {
						b := &Body{}
						if baggage {
							b.SetBaggage(values(c.Body))
						} else {
							b.SetExtensions(values(c.Body))
						}
						env.SetBody(b)
					}
					before := proto.Clone(env)
					get := GetExtension[*EventStreamPosition]
					must := MustGetExtension[*EventStreamPosition]
					if baggage {
						get = GetBaggage[*EventStreamPosition]
						must = MustGetBaggage[*EventStreamPosition]
					}
					got, present, err := get(env)
					if (err != nil) != c.Error {
						t.Fatalf("decode error: got %v, expected error %v", err, c.Error)
					}
					if c.Error && !present {
						t.Error("decode failure did not report the selected value as present")
					}
					if !c.Error {
						if c.Offset == nil && got != nil {
							t.Error("absent lookup returned a value")
						}
						if present != (c.Offset != nil) {
							t.Fatalf("unexpected presence: %v", present)
						}
						if c.Offset != nil && got.GetOffset() != *c.Offset {
							t.Fatalf("offset: got %d, want %d", got.GetOffset(), *c.Offset)
						}
					}
					if c.Error || c.Offset == nil {
						func() {
							defer func() {
								if recover() == nil {
									t.Error("required lookup did not panic")
								}
							}()
							must(env)
						}()
					} else if !proto.Equal(must(env), got) {
						t.Error("required and optional lookups differ")
					}
					if !proto.Equal(env, before) {
						t.Error("lookup mutated the envelope")
					}
				})
			}
		})
	}
}

func TestMetadataSetThenGet(t *testing.T) {
	for _, baggage := range []bool{false, true} {
		for _, onHeader := range []bool{false, true} {
			name := "extensions"
			if baggage {
				name = "baggage"
			}
			if onHeader {
				name += "/header"
			} else {
				name += "/body"
			}
			t.Run(name, func(t *testing.T) {
				env := NewEnvelopeBuilder().WithHeader(&Header{}).WithBody(&Body{}).Build()
				unrelated := &anypb.Any{TypeUrl: "example.com/", Value: []byte{0xff}}
				first := &anypb.Any{TypeUrl: "example.com/dogma.protobuf.v1.EventStreamPosition", Value: []byte{0x10, 1}}
				duplicate := &anypb.Any{TypeUrl: "type.googleapis.com/dogma.protobuf.v1.EventStreamPosition", Value: []byte{0x10, 2}}
				items := []*anypb.Any{unrelated, first, duplicate}
				value := NewEventStreamPositionBuilder().WithOffset(3).Build()
				var after []*anypb.Any
				var got *EventStreamPosition
				if baggage {
					if onHeader {
						env.GetHeader().SetBaggage(items)
						SetBaggage(env.GetHeader(), value)
						after = env.GetHeader().GetBaggage()
					} else {
						env.GetBody().SetBaggage(items)
						SetBaggage(env.GetBody(), value)
						after = env.GetBody().GetBaggage()
					}
					got = MustGetBaggage[*EventStreamPosition](env)
				} else {
					if onHeader {
						env.GetHeader().SetExtensions(items)
						SetExtension(env.GetHeader(), value)
						after = env.GetHeader().GetExtensions()
					} else {
						env.GetBody().SetExtensions(items)
						SetExtension(env.GetBody(), value)
						after = env.GetBody().GetExtensions()
					}
					got = MustGetExtension[*EventStreamPosition](env)
				}
				if got.GetOffset() != 3 {
					t.Fatalf("set then get offset: %d", got.GetOffset())
				}
				if len(after) != 3 || after[0] != unrelated || after[2] != duplicate {
					t.Fatal("setter changed unrelated or later duplicate values")
				}
				if onHeader {
					bodyValue := NewEventStreamPositionBuilder().WithOffset(4).Build()
					if baggage {
						SetBaggage(env.GetBody(), bodyValue)
						SetBaggage(env.GetHeader(), value)
						got = MustGetBaggage[*EventStreamPosition](env)
					} else {
						SetExtension(env.GetBody(), bodyValue)
						SetExtension(env.GetHeader(), value)
						got = MustGetExtension[*EventStreamPosition](env)
					}
					if got.GetOffset() != 4 {
						t.Fatal("setting the header overrode the body")
					}
				}
			})
		}
	}
}
