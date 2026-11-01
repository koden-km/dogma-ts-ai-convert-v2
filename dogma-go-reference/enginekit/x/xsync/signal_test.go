package xsync_test

import (
	"context"
	"testing"
	"testing/synctest"

	. "github.com/dogmatiq/enginekit/x/xsync"
)

func TestSignal(t *testing.T) {
	t.Run("Notify()", func(t *testing.T) {
		t.Run("unblocks an existing waiter", func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				var signal Signal

				unblockedWait := false
				go func() {
					signal.Wait()
					unblockedWait = true
				}()

				// Block until the waiting goroutine is blocked on the signal.
				synctest.Wait()

				if !signal.Notify() {
					t.Fatal("expected notification to be recorded")
				}

				// Block until the waiting goroutine exits (or remains blocked
				// if something is wrong).
				synctest.Wait()

				if !unblockedWait {
					t.Fatal("expected Wait() to unblock")
				}
			})
		})

		t.Run("unblocks a future waiter", func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				var signal Signal

				// Notify before starting the waiting goroutines.
				signal.Notify()

				unblockedWait := false
				go func() {
					signal.Wait()
					unblockedWait = true
				}()

				synctest.Wait()

				if !unblockedWait {
					t.Fatal("expected Wait() to unblock")
				}

				unblockedChan := false
				signal.Notify()
				go func() {
					<-signal.Chan()
					unblockedChan = true
				}()

				synctest.Wait()

				if !unblockedChan {
					t.Fatal("expected Chan() to unblock")
				}
			})
		})

		t.Run("unblocks only one waiter per notification", func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				var signal Signal

				unblocked := 0
				for range 2 {
					go func() {
						signal.Wait()
						unblocked++
					}()
				}

				synctest.Wait()
				signal.Notify()
				synctest.Wait()

				if unblocked != 1 {
					t.Fatalf("unexpected number of unblocked waiters: got %d, want 1", unblocked)
				}

				signal.Notify()
				synctest.Wait()

				if unblocked != 2 {
					t.Fatalf("unexpected number of unblocked waiters: got %d, want 2", unblocked)
				}
			})
		})

		t.Run("coalesces notifications while one is pending", func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				var signal Signal

				if !signal.Notify() {
					t.Fatal("expected first notification to be recorded")
				}

				if signal.Notify() {
					t.Fatal("expected second notification to be coalesced")
				}

				signal.Wait()

				unblocked := false
				go func() {
					signal.Wait()
					unblocked = true
				}()

				synctest.Wait()

				if unblocked {
					t.Fatal("expected only one notification to be pending")
				}

				signal.Notify()
				synctest.Wait()

				if !unblocked {
					t.Fatal("expected Wait() to unblock")
				}
			})
		})
	})

	t.Run("WaitContext()", func(t *testing.T) {
		t.Run("returns nil when the signal is notified", func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				var signal Signal

				var waitErr error
				go func() {
					waitErr = signal.WaitContext(context.Background())
				}()

				synctest.Wait()
				signal.Notify()
				synctest.Wait()

				if waitErr != nil {
					t.Fatalf("unexpected error: %v", waitErr)
				}
			})
		})

		t.Run("returns context error when canceled", func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				var signal Signal

				ctx, cancel := context.WithCancel(context.Background())

				var waitErr error
				go func() {
					waitErr = signal.WaitContext(ctx)
				}()

				synctest.Wait()
				cancel()
				synctest.Wait()

				if waitErr != context.Canceled {
					t.Fatalf("unexpected error: got %v, want %v", waitErr, context.Canceled)
				}
			})
		})
	})
}
