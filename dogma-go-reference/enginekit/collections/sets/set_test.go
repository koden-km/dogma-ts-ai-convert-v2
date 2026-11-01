package sets_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/collections/sets"
	"pgregory.net/rapid"
)

func TestSet(t *testing.T) {
	testSet(
		t,
		New[string],
		NewFromSeq[string],
		NewFromKeys[string],
		NewFromValues[string],
		func(x, y string) bool { return x == y },
		func(m string) bool { return len(m)%2 == 0 },
		rapid.String(),
	)
}
