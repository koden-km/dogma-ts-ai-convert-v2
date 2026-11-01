package xsync

import (
	"context"
	"sync/atomic"
)

// Future is a container for a value that may not yet be available.
type Future[T any] struct {
	ptr atomic.Pointer[T]
	ch  atomic.Pointer[chan struct{}]
}

// Load returns the value stored in the [Future], if it is ready.
func (a *Future[T]) Load() (T, bool) {
	if p := a.ptr.Load(); p != nil {
		return *p, true
	}

	var zero T
	return zero, false
}

// Store sets the value of the [Future].
//
// It returns false if the value was already set.
func (a *Future[T]) Store(v T) bool {
	if a.ptr.CompareAndSwap(nil, &v) {
		close(a.stored())
		return true
	}

	return false
}

// Ready returns a channel that is closed when the value becomes available.
func (a *Future[T]) Ready() <-chan struct{} {
	return a.stored()
}

// Wait blocks until the value becomes available.
func (a *Future[T]) Wait() T {
	<-a.stored()
	return *a.ptr.Load()
}

// WaitContext blocks until the value becomes available or the context is
// canceled.
func (a *Future[T]) WaitContext(ctx context.Context) (T, error) {
	if p := a.ptr.Load(); p != nil {
		return *p, nil
	}

	select {
	case <-ctx.Done():
		var zero T
		return zero, ctx.Err()
	case <-a.stored():
		return *a.ptr.Load(), nil
	}
}

func (a *Future[T]) stored() chan struct{} {
	if r := a.ch.Load(); r != nil {
		return *r
	}

	ch := make(chan struct{})
	if a.ch.CompareAndSwap(nil, &ch) {
		return ch
	}

	return *a.ch.Load()
}
