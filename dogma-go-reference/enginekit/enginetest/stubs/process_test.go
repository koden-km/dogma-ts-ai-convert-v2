package stubs_test

import (
	"testing"

	"github.com/dogmatiq/dogma"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
)

func TestProcessMessageHandlerStub_New(t *testing.T) {
	t.Run("when R is a pointer type", func(t *testing.T) {
		t.Run("it returns a non-nil pointer", func(t *testing.T) {
			h := &ProcessMessageHandlerStub[*ProcessRootStub]{}
			root := h.New()
			if root == nil {
				t.Fatal("expected non-nil root")
			}
		})
	})

	t.Run("when R is a non-pointer type", func(t *testing.T) {
		t.Run("it returns the zero value", func(t *testing.T) {
			h := &ProcessMessageHandlerStub[dogma.ProcessRoot]{}
			root := h.New()
			if root != nil {
				t.Fatalf("expected nil, got %v", root)
			}
		})
	})
}
