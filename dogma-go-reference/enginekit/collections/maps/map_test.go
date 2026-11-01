package maps_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/collections/maps"
	"pgregory.net/rapid"
)

func TestMap(t *testing.T) {
	testMap(
		t,
		New[string, int],
		NewFromSeq[string, int],
		func(x, y string) bool { return x == y },
		rapid.String(),
	)
}
