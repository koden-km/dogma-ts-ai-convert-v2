package maps_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/collections/maps"
	. "github.com/dogmatiq/enginekit/internal/stubs"
	"google.golang.org/protobuf/proto"
	"pgregory.net/rapid"
)

func TestProtoMap(t *testing.T) {
	testMap(
		t,
		NewProto[*ProtoStubA, int],
		NewProtoFromSeq[*ProtoStubA, int],
		func(x, y *ProtoStubA) bool { return proto.Equal(x, y) },
		rapid.Custom(
			func(t *rapid.T) *ProtoStubA {
				return NewProtoStubABuilder().
					WithValue(rapid.String().Draw(t, "value")).
					Build()
			},
		),
	)
}
