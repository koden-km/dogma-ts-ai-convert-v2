package stubs_test

import (
	"testing"

	"github.com/dogmatiq/dogma"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	"github.com/google/go-cmp/cmp"
)

func TestAggregateMessageHandlerStub_New(t *testing.T) {
	t.Run("when R is a pointer type", func(t *testing.T) {
		t.Run("it returns a non-nil pointer", func(t *testing.T) {
			h := &AggregateMessageHandlerStub[*AggregateRootStub]{}
			root := h.New()
			if root == nil {
				t.Fatal("expected non-nil root")
			}
		})
	})

	t.Run("when R is a non-pointer type", func(t *testing.T) {
		t.Run("it returns the zero value", func(t *testing.T) {
			h := &AggregateMessageHandlerStub[dogma.AggregateRoot]{}
			root := h.New()
			if root != nil {
				t.Fatalf("expected nil, got %v", root)
			}
		})
	})
}

func TestAggregateRootStub_MarshalBinary(t *testing.T) {
	t.Run("it round-trips with no events", func(t *testing.T) {
		original := &AggregateRootStub{}

		data, err := original.MarshalBinary()
		if err != nil {
			t.Fatal(err)
		}

		restored := &AggregateRootStub{}
		if err := restored.UnmarshalBinary(data); err != nil {
			t.Fatal(err)
		}

		if len(restored.AppliedEvents) != 0 {
			t.Fatalf("expected no events, got %d", len(restored.AppliedEvents))
		}
	})

	t.Run("it round-trips with multiple events", func(t *testing.T) {
		original := &AggregateRootStub{}
		original.ApplyEvent(&EventStub[TypeA]{Content: "hello"})
		original.ApplyEvent(&EventStub[TypeB]{Content: "world"})

		data, err := original.MarshalBinary()
		if err != nil {
			t.Fatal(err)
		}

		restored := &AggregateRootStub{}
		if err := restored.UnmarshalBinary(data); err != nil {
			t.Fatal(err)
		}

		if diff := cmp.Diff(original.AppliedEvents, restored.AppliedEvents); diff != "" {
			t.Fatalf("unexpected events (-want +got):\n%s", diff)
		}
	})
}
