package optional_test

import (
	"strconv"
	"testing"

	. "github.com/dogmatiq/enginekit/optional"
)

func TestTransform(t *testing.T) {
	in := Some(42)
	out := Transform(in, strconv.Itoa)

	if !out.IsPresent() {
		t.Fatal("expected transformed value to be present")
	}

	if x := out.Get(); x != "42" {
		t.Fatalf("unexpected transformed value: got %v, want '42'", x)
	}

	in = None[int]()
	out = Transform(in, strconv.Itoa)

	if out.IsPresent() {
		t.Fatal("expected transformed value to be absent")
	}
}

func TestTryTransform(t *testing.T) {
	atoi := func(v string) (int, bool) {
		i, err := strconv.Atoi(v)
		return i, err == nil
	}

	in := Some("42")
	out := TryTransform(in, atoi)

	if !out.IsPresent() {
		t.Fatal("expected transformed value to be present")
	}

	if x := out.Get(); x != 42 {
		t.Fatalf("unexpected transformed value: got %v, want 42", x)
	}

	in = Some("not a number")
	out = TryTransform(in, atoi)

	if out.IsPresent() {
		t.Fatal("expected transformed value to be absent")
	}

	in = None[string]()
	out = TryTransform(in, atoi)

	if out.IsPresent() {
		t.Fatal("expected transformed value to be absent")
	}
}

func TestAs(t *testing.T) {
	in := Some[any](42)
	out := As[int](in)

	if !out.IsPresent() {
		t.Fatal("expected transformed value to be present")
	}

	if x := out.Get(); x != 42 {
		t.Fatalf("unexpected transformed value: got %v, want 42", x)
	}

	in = Some[any]("not a number")
	out = As[int](in)

	if out.IsPresent() {
		t.Fatal("expected transformed value to be absent")
	}

	in = None[any]()
	out = As[int](in)

	if out.IsPresent() {
		t.Fatal("expected transformed value to be absent")
	}
}
