package optional_test

import (
	"testing"

	"github.com/dogmatiq/enginekit/optional"
	. "github.com/dogmatiq/enginekit/optional"
)

func TestAtIndex(t *testing.T) {
	values := []string{"one", "two", "three"}

	cases := []struct {
		Index int
		Want  optional.Optional[string]
	}{
		{0, Some("one")},
		{1, Some("two")},
		{2, Some("three")},
		{3, None[string]()},
		{-1, None[string]()},
	}

	for _, c := range cases {
		if got := AtIndex(values, c.Index); !Equal(got, c.Want) {
			t.Errorf("unexpected value at index %d: got %s, want %s", c.Index, got, c.Want)
		}
	}
}

func TestFirstAndLast(t *testing.T) {
	values := []string{"one", "two", "three"}
	wantFirst := Some("one")
	wantLast := Some("three")

	gotFirst := First(values)
	gotLast := Last(values)

	if !Equal(gotFirst, wantFirst) {
		t.Fatalf("unexpected first value: got %s, want %s", gotFirst, wantFirst)
	}

	if !Equal(gotLast, wantLast) {
		t.Fatalf("unexpected last value: got %s, want %s", gotLast, wantLast)
	}

	values = []string{}
	wantFirst = None[string]()
	wantLast = None[string]()

	gotFirst = First(values)
	gotLast = Last(values)

	if !Equal(gotFirst, wantFirst) {
		t.Fatalf("unexpected first value: got %s, want %s", gotFirst, wantFirst)
	}

	if !Equal(gotLast, wantLast) {
		t.Fatalf("unexpected last value: got %s, want %s", gotLast, wantLast)
	}
}

func TestKey(t *testing.T) {
	values := map[string]int{
		"one":   1,
		"two":   2,
		"three": 3,
	}

	cases := []struct {
		Key  string
		Want optional.Optional[int]
	}{
		{"one", Some(1)},
		{"two", Some(2)},
		{"three", Some(3)},
		{"four", None[int]()},
		{"", None[int]()},
	}

	for _, c := range cases {
		if got := Key(values, c.Key); !Equal(got, c.Want) {
			t.Errorf("unexpected value for key %s: got %d, want %d", c.Key, got, c.Want)
		}
	}
}
