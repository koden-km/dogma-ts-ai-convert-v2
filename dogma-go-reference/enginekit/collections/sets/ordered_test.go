package sets_test

import (
	"cmp"
	"testing"

	. "github.com/dogmatiq/enginekit/collections/sets"
	"pgregory.net/rapid"
)

func TestOrderedSet(t *testing.T) {
	testOrderedSet(
		t,
		NewOrdered[string],
		NewOrderedFromSeq[string],
		NewOrderedFromKeys[string],
		NewOrderedFromValues[string],
		cmp.Compare[string],
		func(m string) bool { return len(m)%2 == 0 },
		rapid.String(),
	)
}
