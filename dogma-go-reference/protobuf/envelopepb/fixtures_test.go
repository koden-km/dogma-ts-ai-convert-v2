package envelopepb_test

import (
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"testing"
	"time"

	. "github.com/dogmatiq/protobuf/envelopepb"
	"github.com/dogmatiq/protobuf/identitypb"
	. "github.com/dogmatiq/protobuf/internal/xtesting"
	"github.com/dogmatiq/protobuf/uuidpb"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/timestamppb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

var updateFixtures = flag.Bool("update-fixtures", false, "regenerate the golden MultiEnvelope fixtures in envelopepb/testdata")

// fixtureDir is the directory containing the golden MultiEnvelope fixtures
// that are shared with the TypeScript tests.
const fixtureDir = "testdata"

// fixtureExpectation describes the extension and baggage values that are
// expected to be found for a single body within a fixture.
//
// The values are the offsets of the [EventStreamPosition] values that are
// found, or nil if no value is expected.
type fixtureExpectation struct {
	ExtensionOffset *uint64 `json:"extensionOffset"`
	BaggageOffset   *uint64 `json:"baggageOffset"`
}

// fixtureCase is a single entry in the fixture expectations file.
type fixtureCase struct {
	File        string               `json:"file"`
	Description string               `json:"description"`
	Bodies      []fixtureExpectation `json:"bodies"`
}

func TestMultiEnvelopeFixtures(t *testing.T) {
	if *updateFixtures {
		writeFixtures(t)
	}

	data, err := os.ReadFile(filepath.Join(fixtureDir, "expectations.json"))
	if err != nil {
		t.Fatal(err)
	}

	var cases []fixtureCase
	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}

	for _, c := range cases {
		t.Run(c.Description, func(t *testing.T) {
			data, err := os.ReadFile(filepath.Join(fixtureDir, c.File))
			if err != nil {
				t.Fatal(err)
			}

			multi := &MultiEnvelope{}
			if err := proto.Unmarshal(data, multi); err != nil {
				t.Fatal(err)
			}

			var got []fixtureExpectation
			for env := range multi.All() {
				var e fixtureExpectation

				if x, ok, err := GetExtension[*EventStreamPosition](env); err != nil {
					t.Fatal(err)
				} else if ok {
					e.ExtensionOffset = new(x.GetOffset())
				}

				if x, ok, err := GetBaggage[*EventStreamPosition](env); err != nil {
					t.Fatal(err)
				} else if ok {
					e.BaggageOffset = new(x.GetOffset())
				}

				got = append(got, e)
			}

			Expect(
				t,
				"unexpected extension and baggage values",
				got,
				c.Bodies,
			)
		})
	}
}

// writeFixtures regenerates the binary fixture files.
//
// The expectations file is maintained by hand.
func writeFixtures(t *testing.T) {
	t.Helper()

	position := func(offset uint64) *anypb.Any {
		x, err := anypb.New(
			NewEventStreamPositionBuilder().
				WithStreamId(uuidpb.MustParse("0a3a5f39-8a5b-4b4e-9d8c-2f5e7c6b1d40")).
				WithOffset(offset).
				Build(),
		)
		if err != nil {
			t.Fatal(err)
		}
		return x
	}

	unrelated, err := anypb.New(wrapperspb.String("unrelated"))
	if err != nil {
		t.Fatal(err)
	}

	header := func(extensions, baggage []*anypb.Any) *Header {
		return NewHeaderBuilder().
			WithCausationId(uuidpb.MustParse("8a2c0b1e-1f3d-4a5b-8c6d-7e8f9a0b1c2d")).
			WithCorrelationId(uuidpb.MustParse("8a2c0b1e-1f3d-4a5b-8c6d-7e8f9a0b1c2d")).
			WithSource(
				NewSourceBuilder().
					WithApplication(identitypb.MustParse("<app>", "4f2a3c5b-6d7e-4f80-9a1b-2c3d4e5f6a7b")).
					Build(),
			).
			WithExtensions(extensions).
			WithBaggage(baggage).
			Build()
	}

	body := func(id string, extensions, baggage []*anypb.Any) *Body {
		return NewBodyBuilder().
			WithMessageId(uuidpb.MustParse(id)).
			WithCreatedAt(timestamppb.New(time.Date(2026, 10, 31, 0, 0, 0, 0, time.UTC))).
			WithMessage(
				NewMessageBuilder().
					WithTypeId(uuidpb.MustParse("c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f")).
					WithDescription("<message>").
					WithData([]byte("<data>")).
					Build(),
			).
			WithExtensions(extensions).
			WithBaggage(baggage).
			Build()
	}

	fixtures := map[string]*MultiEnvelope{
		"absent.binpb": NewMultiEnvelopeBuilder().
			WithHeader(header(nil, nil)).
			WithBodies([]*Body{
				body("d1e2f3a4-b5c6-4d7e-8f90-a1b2c3d4e5f6", []*anypb.Any{unrelated}, []*anypb.Any{unrelated}),
			}).
			Build(),
		"header-only.binpb": NewMultiEnvelopeBuilder().
			WithHeader(header([]*anypb.Any{unrelated, position(1)}, []*anypb.Any{unrelated, position(2)})).
			WithBodies([]*Body{
				body("d1e2f3a4-b5c6-4d7e-8f90-a1b2c3d4e5f6", nil, nil),
			}).
			Build(),
		"body-only.binpb": NewMultiEnvelopeBuilder().
			WithHeader(header(nil, nil)).
			WithBodies([]*Body{
				body("d1e2f3a4-b5c6-4d7e-8f90-a1b2c3d4e5f6", []*anypb.Any{unrelated, position(3)}, []*anypb.Any{unrelated, position(4)}),
			}).
			Build(),
		"conflicting.binpb": NewMultiEnvelopeBuilder().
			WithHeader(header([]*anypb.Any{position(1)}, []*anypb.Any{position(2)})).
			WithBodies([]*Body{
				body("d1e2f3a4-b5c6-4d7e-8f90-a1b2c3d4e5f6", []*anypb.Any{position(3)}, []*anypb.Any{position(4)}),
			}).
			Build(),
		"mixed.binpb": NewMultiEnvelopeBuilder().
			WithHeader(header([]*anypb.Any{position(1)}, []*anypb.Any{position(2)})).
			WithBodies([]*Body{
				body("d1e2f3a4-b5c6-4d7e-8f90-a1b2c3d4e5f6", nil, nil),
				body("e2f3a4b5-c6d7-4e8f-90a1-b2c3d4e5f6a7", []*anypb.Any{position(3)}, nil),
				body("f3a4b5c6-d7e8-4f90-a1b2-c3d4e5f6a7b8", nil, []*anypb.Any{position(4)}),
			}).
			Build(),
	}

	for file, multi := range fixtures {
		data, err := proto.MarshalOptions{Deterministic: true}.Marshal(multi)
		if err != nil {
			t.Fatal(err)
		}

		if err := os.WriteFile(filepath.Join(fixtureDir, file), data, 0o644); err != nil {
			t.Fatal(err)
		}
	}
}
