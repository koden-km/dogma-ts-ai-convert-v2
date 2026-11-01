package maps_test

import (
	"cmp"
	"testing"

	. "github.com/dogmatiq/enginekit/collections/maps"
	"pgregory.net/rapid"
)

type reverseStringComparator struct{}

func (reverseStringComparator) Compare(x, y string) int {
	return -cmp.Compare(x, y)
}

func TestOrderedByComparator(t *testing.T) {
	cmp := &reverseStringComparator{}

	testOrderedMap(
		t,
		NewOrderedByComparator[string, int, reverseStringComparator],
		NewOrderedByComparatorFromSeq,
		cmp.Compare,
		rapid.String(),
	)
}
