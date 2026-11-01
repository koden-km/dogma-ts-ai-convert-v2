package xatomic_test

import (
	"runtime"
	"slices"
	"sync"
	"testing"

	. "github.com/dogmatiq/enginekit/x/xatomic"
)

func TestValue(t *testing.T) {
	var v Value[int32]
	var g sync.WaitGroup

	want := []int32{
		0x0771fc2e,
		0x7ee3034b,
	}

	n := v.Load()
	if n != 0 {
		t.Fatalf("unexpected initial value: got %v, want 0", n)
	}

	// Start concurrent writers.
	for range 10 {
		g.Add(1)
		go func() {
			defer g.Done()

			for range 1000 {
				for _, n := range want {
					runtime.Gosched()
					v.Store(n)
				}
			}
		}()
	}

	for range 1000 {
		runtime.Gosched()
		n := v.Load()

		if n != 0 && !slices.Contains(want, n) {
			t.Fatalf("unexpected value: got %v, want one of %v", n, want)
		}
	}

	g.Wait()
}
