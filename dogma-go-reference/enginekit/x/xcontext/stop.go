package xcontext

import (
	"context"
	"sync/atomic"
)

// A StopFunc tells an operation to stop after its completed its current unit of
// work. It is used to implement graceful shutdown semantics.
//
// Contrast to [context.CancelFunc] which is is typically used to implement
// "forceful" cancellation semantics.
//
// It does not wait for the work to stop. It may be called by multiple
// goroutines simultaneously. After the first call, subsequent calls do nothing.
type StopFunc func()

// Stopped returns a channel that is closed when the context is stopped.
//
// It returns nil if the context is not stoppable.
func Stopped(ctx context.Context) <-chan struct{} {
	ch, _ := singleValue[stopChan](ctx)
	return ch
}

// WithStop returns a derived context that points to the parent context but has
// a new [Stopped] channel.
//
// The returned context's [Stopped] channel is closed when the returned stop
// function is called or when the parent context's [Stopped] channel is closed,
// whichever happens first.
//
// Canceling the parent context not close the returned context's [Stopped]
// channel.
func WithStop(parent context.Context) (ctx context.Context, stop StopFunc) {
	ch := make(stopChan)
	ctx = withSingleValue(parent, ch)

	var closed atomic.Bool
	stop = func() {
		if closed.CompareAndSwap(false, true) {
			close(ch)
		}
	}

	if p, ok := singleValue[stopChan](parent); ok {
		go func() {
			select {
			case <-ctx.Done():
			case <-ch:
			case <-p:
				stop()
			}
		}()
	}

	return ctx, stop
}

type stopChan chan struct{}
