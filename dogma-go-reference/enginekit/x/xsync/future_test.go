package xsync_test

import (
	"context"
	"fmt"
	"testing"
	"testing/synctest"

	. "github.com/dogmatiq/enginekit/x/xsync"
	"golang.org/x/sync/errgroup"
)

func TestFuture(t *testing.T) {

	synctest.Test(t, func(t *testing.T) {
		var f Future[int]

		_, ok := f.Load()
		if ok {
			t.Fatal("did not expect load to succeed")
		}

		want := 42

		g, ctx := errgroup.WithContext(t.Context())

		g.Go(func() error {
			v := f.Wait()

			if v != want {
				return fmt.Errorf("unexpected value after waiting for future in background: got %v, want %v", v, want)
			}

			return nil
		})

		g.Go(func() error {
			synctest.Wait()

			if !f.Store(want) {
				return fmt.Errorf("expected Store() to return true the first time a value is stored")
			}

			if f.Store(want + 1) {
				return fmt.Errorf("expected Store() to return false the second time a value is stored")
			}

			return nil
		})

		select {
		case <-ctx.Done():
			t.Fatal(context.Cause(ctx))
		case <-f.Ready():
		}

		v, ok := f.Load()
		if !ok {
			t.Fatal("expected load to succeed")
		}

		if v != want {
			t.Fatalf("unexpected value: got %v, want %v", v, want)
		}

		if err := g.Wait(); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("WaitContext()", func(t *testing.T) {
		t.Run("returns value when ready", func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				var f Future[int]

				want := 42
				var got int
				var waitErr error

				go func() {
					got, waitErr = f.WaitContext(context.Background())
				}()

				synctest.Wait()
				f.Store(want)
				synctest.Wait()

				if waitErr != nil {
					t.Fatalf("unexpected error: %v", waitErr)
				}

				if got != want {
					t.Fatalf("unexpected value: got %v, want %v", got, want)
				}
			})
		})

		t.Run("returns context error when canceled", func(t *testing.T) {
			synctest.Test(t, func(t *testing.T) {
				var f Future[int]

				ctx, cancel := context.WithCancel(context.Background())

				var waitErr error
				go func() {
					_, waitErr = f.WaitContext(ctx)
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
