package maps_test

import (
	"cmp"
	"testing"

	. "github.com/dogmatiq/enginekit/collections/maps"
	"pgregory.net/rapid"
)

type reverseOrderedString string

func (s reverseOrderedString) Compare(x reverseOrderedString) int {
	return cmp.Compare(x, s)
}

func TestOrderedByKey(t *testing.T) {
	testOrderedMap(
		t,
		NewOrderedByKey[reverseOrderedString, int],
		NewOrderedByKeyFromSeq[reverseOrderedString, int],
		reverseOrderedString.Compare,
		rapid.Custom(
			func(t *rapid.T) reverseOrderedString {
				return reverseOrderedString(rapid.String().Draw(t, "value"))
			},
		),
	)
}
