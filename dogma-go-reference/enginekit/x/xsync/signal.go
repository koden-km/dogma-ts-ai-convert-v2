package xsync

import (
	"context"
	"sync"
)

// Signal is a synchronization primitive that allows one goroutine to notify
// another that some event has occurred.
//
// A signal can be notified repeatedly. Each notification unblocks at most one
// waiting goroutine and is consumed by it. Notifications that occur while
// another is already pending are coalesced into one.
type Signal struct {
	once sync.Once
	ch   chan struct{}
}

// Notify unblocks one waiting goroutine.
//
// If there are no waiting goroutines, the notification remains pending and a
// future waiting goroutine will unblock immediately.
//
// It returns true if the notification was recorded, or false if one was already
// pending.
func (s *Signal) Notify() bool {
	select {
	case s.init() <- struct{}{}:
		return true
	default:
		return false
	}
}

// Wait blocks until the signal is notified.
//
// It unblocks immediately if a notification is pending, and consumes it.
func (s *Signal) Wait() {
	<-s.init()
}

// WaitContext blocks until the signal is notified or ctx is canceled.
//
// It unblocks immediately if a notification is pending, and consumes it.
func (s *Signal) WaitContext(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-s.init():
		return nil
	}
}

// Chan returns a channel that unblocks when the signal is notified.
//
// Receiving from the channel consumes the pending notification, exactly as
// [Signal.Wait] does.
func (s *Signal) Chan() <-chan struct{} {
	return s.init()
}

func (s *Signal) init() chan struct{} {
	s.once.Do(func() {
		s.ch = make(chan struct{}, 1)
	})
	return s.ch
}
