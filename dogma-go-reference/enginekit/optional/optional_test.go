package optional_test

import (
	"fmt"
	"testing"

	. "github.com/dogmatiq/enginekit/optional"
)

func TestSome(t *testing.T) {
	v := Some(42)

	if !v.IsPresent() {
		t.Fatal("expected value to be present")
	}

	if x := v.Get(); x != 42 {
		t.Fatalf("unexpected value: got %v, want 42", x)
	}

	if x, ok := v.TryGet(); !ok {
		t.Fatal("expected value to be present")
	} else if x != 42 {
		t.Fatalf("unexpected value: got %v, want 42", x)
	}
}

func TestNone(t *testing.T) {
	v := None[int]()

	if v.IsPresent() {
		t.Fatal("expected value to be absent")
	}

	func() {
		defer func() {
			if x := recover(); x == nil {
				t.Fatal("expected a panic")
			}
		}()

		v.Get()
	}()

	if x, ok := v.TryGet(); ok {
		t.Fatal("expected value to be absent")
	} else if x != 0 {
		t.Fatalf("unexpected value: got %v, want 0", x)
	}
}

func TestFormat(t *testing.T) {
	cases := []struct {
		V    fmt.Formatter
		Spec string
		Want string
	}{
		{Some(42), "%v", "42"},
		{Some(42), "%05d", "00042"},
		{None[int](), "%v", "0"},

		{Some(42), "%s", "%!s(int=42)"},
		{None[int](), "%-30s", "optional.None[int]()          "},

		{Some(42), "%#v", "optional.Some(42)"},
		{Some[uint](42), "%#v", "optional.Some(0x2a)"},
		{None[int](), "%#v", "optional.None[int]()"},

		{Some(42), "%T", "optional.Optional[int]"},
		{None[int](), "%T", "optional.Optional[int]"},
	}

	for _, c := range cases {
		t.Run(c.Spec, func(t *testing.T) {
			if got := fmt.Sprintf(c.Spec, c.V); got != c.Want {
				t.Fatalf("unexpected formatted value: got %q, want %q", got, c.Want)
			}
		})
	}
}
