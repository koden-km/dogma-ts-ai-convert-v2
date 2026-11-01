package message_test

import (
	"errors"
	"testing"

	"github.com/dogmatiq/dogma"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	"github.com/dogmatiq/enginekit/internal/test"
	. "github.com/dogmatiq/enginekit/message"
)

func TestKind(t *testing.T) {
	test.Enum(
		t,
		test.EnumSpec[Kind]{
			Range:       Kinds,
			Switch:      SwitchByKind,
			MapToString: MapByKind[string],
		},
	)
}

func TestSwitchByKindOf(t *testing.T) {
	t.Run("when the message is a command", func(t *testing.T) {
		var message dogma.Command

		SwitchByKindOf(
			CommandA1,
			func(m dogma.Command) { message = m },
			func(m dogma.Event) { t.Fatal("unexpected call to event case") },
			func(m dogma.Deadline) { t.Fatal("unexpected call to deadline case") },
		)

		if message != CommandA1 {
			t.Fatal("command case was not called with the expected message")
		}
	})

	t.Run("when the message is an event", func(t *testing.T) {
		var message dogma.Event

		SwitchByKindOf(
			EventA1,
			func(m dogma.Command) { t.Fatal("unexpected call to command case") },
			func(m dogma.Event) { message = m },
			func(m dogma.Deadline) { t.Fatal("unexpected call to deadline case") },
		)

		if message != EventA1 {
			t.Fatal("event case was not called with the expected message")
		}
	})

	t.Run("when the message is a deadline", func(t *testing.T) {
		var message dogma.Deadline

		SwitchByKindOf(
			DeadlineA1,
			func(m dogma.Command) { t.Fatal("unexpected call to command case") },
			func(m dogma.Event) { t.Fatal("unexpected call to event case") },
			func(m dogma.Deadline) { message = m },
		)

		if message != DeadlineA1 {
			t.Fatal("deadline case was not called with the expected message")
		}
	})

	t.Run("it panics when the associated function is nil", func(t *testing.T) {
		cases := []struct {
			Message dogma.Message
			Want    string
		}{
			{CommandA1, `no case function was provided for dogma.Command`},
			{EventA1, `no case function was provided for dogma.Event`},
			{DeadlineA1, `no case function was provided for dogma.Deadline`},
		}

		for _, c := range cases {
			func() {
				defer func() {
					if got := recover(); got != c.Want {
						t.Fatalf("unexpected panic: got %q, want %q", got, c.Want)
					}
				}()

				SwitchByKindOf(c.Message, nil, nil, nil)
			}()
		}
	})

	t.Run("it panics if the message does not implement any of the more specific interfaces", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		SwitchByKindOf(
			nil,
			func(m dogma.Command) { t.Fatal("unexpected call to command case") },
			func(m dogma.Event) { t.Fatal("unexpected call to event case") },
			func(m dogma.Deadline) { t.Fatal("unexpected call to deadline case") },
		)
	})
}

func TestMapByKindOf(t *testing.T) {
	cases := []struct {
		Message dogma.Message
		Want    string
	}{
		{CommandA1, "command"},
		{EventA1, "event"},
		{DeadlineA1, "deadline"},
	}

	for _, c := range cases {
		got := MapByKindOf(
			c.Message,
			func(m dogma.Command) string { return "command" },
			func(m dogma.Event) string { return "event" },
			func(m dogma.Deadline) string { return "deadline" },
		)

		if got != c.Want {
			t.Fatalf("unexpected result: got %q, want %q", got, c.Want)
		}
	}

	t.Run("it panics when the associated function is nil", func(t *testing.T) {
		cases := []struct {
			Message dogma.Message
			Want    string
		}{
			{CommandA1, `no case function was provided for dogma.Command`},
			{EventA1, `no case function was provided for dogma.Event`},
			{DeadlineA1, `no case function was provided for dogma.Deadline`},
		}

		for _, c := range cases {
			func() {
				defer func() {
					if got := recover(); got != c.Want {
						t.Fatalf("unexpected panic: got %q, want %q", got, c.Want)
					}
				}()

				MapByKindOf[int](c.Message, nil, nil, nil)
			}()
		}
	})

	t.Run("it panics if the message does not implement any of the more specific interfaces", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		MapByKindOf(
			nil,
			func(m dogma.Command) string { t.Fatal("unexpected call to command case"); return "" },
			func(m dogma.Event) string { t.Fatal("unexpected call to event case"); return "" },
			func(m dogma.Deadline) string { t.Fatal("unexpected call to deadline case"); return "" },
		)
	})
}

func TestMapByKindOfWithErr(t *testing.T) {
	cases := []struct {
		Message dogma.Message
		Want    string
	}{
		{CommandA1, "command"},
		{EventA1, "event"},
		{DeadlineA1, "deadline"},
	}

	for _, c := range cases {
		got, gotErr := MapByKindOfWithErr(
			c.Message,
			func(m dogma.Command) (string, error) { return "command", errors.New("command") },
			func(m dogma.Event) (string, error) { return "event", errors.New("event") },
			func(m dogma.Deadline) (string, error) { return "deadline", errors.New("deadline") },
		)

		if got != c.Want {
			t.Fatalf("unexpected result: got %q, want %q", got, c.Want)
		}

		if gotErr == nil {
			t.Fatal("expected an error")
		}

		if gotErr.Error() != c.Want {
			t.Fatalf("unexpected error: got %q, want %q", gotErr, c.Want)
		}
	}

	t.Run("it panics when the associated function is nil", func(t *testing.T) {
		cases := []struct {
			Message dogma.Message
			Want    string
		}{
			{CommandA1, `no case function was provided for dogma.Command`},
			{EventA1, `no case function was provided for dogma.Event`},
			{DeadlineA1, `no case function was provided for dogma.Deadline`},
		}

		for _, c := range cases {
			func() {
				defer func() {
					if got := recover(); got != c.Want {
						t.Fatalf("unexpected panic: got %q, want %q", got, c.Want)
					}
				}()

				MapByKindOfWithErr[int](c.Message, nil, nil, nil)
			}()
		}
	})

	t.Run("it panics if the message does not implement any of the more specific interfaces", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		MapByKindOfWithErr(
			nil,
			func(m dogma.Command) (string, error) { t.Fatal("unexpected call to command case"); return "", nil },
			func(m dogma.Event) (string, error) { t.Fatal("unexpected call to event case"); return "", nil },
			func(m dogma.Deadline) (string, error) { t.Fatal("unexpected call to deadline case"); return "", nil },
		)
	})
}
