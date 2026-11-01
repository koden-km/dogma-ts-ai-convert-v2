package xrapid

import (
	"github.com/dogmatiq/enginekit/protobuf/identitypb"
	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
	"pgregory.net/rapid"
)

// Identity returns a generator of random [*identitypb.Identity] values.
func Identity() *rapid.Generator[*identitypb.Identity] {
	return rapid.Custom(
		func(t *rapid.T) *identitypb.Identity {
			ident := identitypb.
				NewIdentityBuilder().
				WithName(rapid.StringN(1, -1, -1).Draw(t, "identity name")).
				WithKey(uuidpb.Generate()).
				Build()

			if err := ident.Validate(); err != nil {
				t.Fatalf("generated invalid identity: %v", err)
			}

			return ident
		},
	)
}
