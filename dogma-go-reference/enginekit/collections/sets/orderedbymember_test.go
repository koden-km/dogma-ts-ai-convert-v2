package sets_test

import (
	"cmp"
	"testing"

	. "github.com/dogmatiq/enginekit/collections/sets"
	"pgregory.net/rapid"
)

type reverseOrderedString string

func (s reverseOrderedString) Compare(x reverseOrderedString) int {
	return cmp.Compare(x, s)
}

func TestOrderedByMember(t *testing.T) {
	testOrderedSet(
		t,
		NewOrderedByMember[reverseOrderedString],
		NewOrderedByMemberFromSeq[reverseOrderedString],
		NewOrderedByMemberFromKeys[reverseOrderedString],
		NewOrderedByMemberFromValues[reverseOrderedString],
		reverseOrderedString.Compare,
		func(m reverseOrderedString) bool { return len(m)%2 == 0 },
		rapid.Custom(
			func(t *rapid.T) reverseOrderedString {
				return reverseOrderedString(rapid.String().Draw(t, "value"))
			},
		),
	)
}
