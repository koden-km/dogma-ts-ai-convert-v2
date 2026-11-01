package message_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	. "github.com/dogmatiq/enginekit/message"
)

func TestNameFor(t *testing.T) {
	got := NameFor[*CommandStub[TypeA]]()
	want := Name("*github.com/dogmatiq/enginekit/enginetest/stubs.CommandStub[github.com/dogmatiq/enginekit/enginetest/stubs.TypeA]")

	if got != want {
		t.Fatalf("unexpected name: got %q, want %q", got, want)
	}
}

func TestNameOf(t *testing.T) {
	got := NameOf(CommandA1)
	want := NameFor[*CommandStub[TypeA]]()

	if got != want {
		t.Fatalf("unexpected name: got %q, want %q", got, want)
	}
}
