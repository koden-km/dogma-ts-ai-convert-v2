package message_test

import (
	"testing"

	"github.com/dogmatiq/dogma"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	. "github.com/dogmatiq/enginekit/message"
)

func TestKind_string(t *testing.T) {
	cases := []struct {
		Kind Kind
		Want string
	}{
		{CommandKind, "command"},
		{EventKind, "event"},
		{DeadlineKind, "deadline"},
	}

	for _, c := range cases {
		got := c.Kind.String()
		if got != c.Want {
			t.Fatalf("unexpected result: got %q, want %q", got, c.Want)
		}
	}
}

func TestKind_symbol(t *testing.T) {
	cases := []struct {
		Kind Kind
		Want string
	}{
		{CommandKind, "?"},
		{EventKind, "!"},
		{DeadlineKind, "@"},
	}

	for _, c := range cases {
		got := c.Kind.Symbol()
		if got != c.Want {
			t.Fatalf("unexpected result: got %q, want %q", got, c.Want)
		}
	}
}

func TestKindFor(t *testing.T) {
	if want, got := CommandKind, KindFor[*CommandStub[TypeA]](); got != want {
		t.Fatalf("unexpected result: got %q, want %q", got, want)
	}

	if want, got := EventKind, KindFor[*EventStub[TypeA]](); got != want {
		t.Fatalf("unexpected result: got %q, want %q", got, want)
	}

	if want, got := DeadlineKind, KindFor[*DeadlineStub[TypeA]](); got != want {
		t.Fatalf("unexpected result: got %q, want %q", got, want)
	}

	if want, got := CommandKind, KindFor[dogma.Command](); got != want {
		t.Fatalf("unexpected result: got %q, want %q", got, want)
	}

	if want, got := EventKind, KindFor[dogma.Event](); got != want {
		t.Fatalf("unexpected result: got %q, want %q", got, want)
	}

	if want, got := DeadlineKind, KindFor[dogma.Deadline](); got != want {
		t.Fatalf("unexpected result: got %q, want %q", got, want)
	}

	t.Run("it panics if the message does not implement any of the more specific interfaces", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		KindFor[dogma.Message]()
	})
}

func TestKindOf(t *testing.T) {
	cases := []struct {
		Message dogma.Message
		Want    Kind
	}{
		{CommandA1, CommandKind},
		{EventA1, EventKind},
		{DeadlineA1, DeadlineKind},
	}

	for _, c := range cases {
		got := KindOf(c.Message)
		if got != c.Want {
			t.Fatalf("unexpected result: got %q, want %q", got, c.Want)
		}
	}

	t.Run("it panics if the message does not implement any of the more specific interfaces", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		KindOf(nil)
	})
}
