package xsync

import (
	"sync/atomic"
)

// Observable is an atomic value that can be observed for changes.
type Observable[T any] struct {
	state atomic.Pointer[observableState[T]]
}

// Load returns the current value and a channel that is closed when that is
// replaced by a subsequent call to Store.
func (o *Observable[T]) Load() (T, <-chan struct{}) {
	if prev := o.state.Load(); prev != nil {
		return prev.value, prev.replaced
	}

	next := &observableState[T]{
		replaced: make(chan struct{}),
	}

	if o.state.CompareAndSwap(nil, next) {
		return next.value, next.replaced
	}

	prev := o.state.Load()
	return prev.value, prev.replaced
}

// Store updates the value.
func (o *Observable[T]) Store(v T) {
	next := &observableState[T]{
		value:    v,
		replaced: make(chan struct{}),
	}

retry:
	prev := o.state.Load()

	if !o.state.CompareAndSwap(prev, next) {
		goto retry
	}

	if prev != nil {
		close(prev.replaced)
	}
}

type observableState[T any] struct {
	value    T
	replaced chan struct{}
}
