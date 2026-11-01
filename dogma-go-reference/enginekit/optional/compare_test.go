package optional_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/optional"
)

func TestCompare(t *testing.T) {
	cases := []struct {
		A    Optional[int]
		B    Optional[int]
		Want int
	}{
		{Some(42), Some(42), 0},
		{Some(42), Some(0), +1},
		{Some(-10), Some(42), -1},
		{Some(42), None[int](), +1},
		{None[int](), Some(42), -1},
		{None[int](), None[int](), 0},
	}

	for _, c := range cases {
		if got := Compare(c.A, c.B); got != c.Want {
			t.Fatalf("unexpected result of comparison between %s and %s: got %d, want %d", c.A, c.B, got, c.Want)
		}

		want := c.Want == 0
		if got := Equal(c.A, c.B); got != want {
			t.Fatalf("unexpected result of %v == %v: got %v, want %v", c.A, c.B, got, want)
		}
	}
}
