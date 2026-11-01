package xcontext

import (
	"context"
	"testing"
	"testing/synctest"
)

func TestWithStop(t *testing.T) {
	t.Run("the stopped channel is closed when the StopFunc is called", func(t *testing.T) {
		synctest.Test(t, func(t *testing.T) {
			ctx, stop := WithStop(t.Context())
			defer stop()

			unblocked := false
			go func() {
				<-Stopped(ctx)
				unblocked = true
			}()

			synctest.Wait()

			if unblocked {
				t.Fatal("stopped channel unblocked early")
			}

			stop()

			synctest.Wait()

			if !unblocked {
				t.Fatal("expected stopped channel to unblock after context was stopped")
			}
		})
	})

	t.Run("the stopped channel is closed when the parent context is stopped", func(t *testing.T) {
		synctest.Test(t, func(t *testing.T) {
			ctx, stopParent := WithStop(t.Context())
			defer stopParent()

			ctx, stopChild := WithStop(ctx)
			defer stopChild()

			unblocked := false
			go func() {
				<-Stopped(ctx)
				unblocked = true
			}()

			synctest.Wait()

			if unblocked {
				t.Fatal("stopped channel unblocked early")
			}

			stopParent()

			synctest.Wait()

			if !unblocked {
				t.Fatal("expected stopped channel to unblock after parent context was stopped")
			}
		})
	})

	t.Run("canceling a context does not stop it", func(t *testing.T) {
		synctest.Test(t, func(t *testing.T) {
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()

			ctx, stop := WithStop(ctx)
			defer stop()

			cancel()
			synctest.Wait()

			select {
			case <-Stopped(ctx):
				t.Fatal("did not expect stopped channel to be closed when the parent context was canceled")
			default:
			}
		})
	})
}
