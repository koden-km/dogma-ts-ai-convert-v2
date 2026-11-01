package sets_test

import (
	"testing"
	"unique"

	. "github.com/dogmatiq/enginekit/collections/sets"
	"pgregory.net/rapid"
)

type stringKeyGenerator struct{}

func (stringKeyGenerator) Key(s string) unique.Handle[string] {
	return unique.Make(s)
}

func TestKeyed(t *testing.T) {
	testSet(
		t,
		NewKeyed[string, unique.Handle[string], stringKeyGenerator],
		NewKeyedFromSeq,
		NewKeyedFromKeys,
		NewKeyedFromValues,
		func(x, y string) bool { return x == y },
		func(m string) bool { return len(m)%2 == 0 },
		rapid.String(),
	)
}
