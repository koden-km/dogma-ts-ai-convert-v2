package sets_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/collections/sets"
	. "github.com/dogmatiq/enginekit/internal/stubs"
	"google.golang.org/protobuf/proto"
	"pgregory.net/rapid"
)

func TestProtoSet(t *testing.T) {
	testSet(
		t,
		NewProto[*ProtoStubA],
		NewProtoFromSeq[*ProtoStubA],
		NewProtoFromKeys[*ProtoStubA],
		NewProtoFromValues[*ProtoStubA],
		func(x, y *ProtoStubA) bool { return proto.Equal(x, y) },
		func(m *ProtoStubA) bool { return len(m.GetValue())%2 == 0 },
		rapid.Custom(
			func(t *rapid.T) *ProtoStubA {
				return NewProtoStubABuilder().
					WithValue(rapid.String().Draw(t, "value")).
					Build()
			},
		),
	)
}
