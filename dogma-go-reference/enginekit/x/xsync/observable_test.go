package xsync_test

import (
	"fmt"
	"math/rand/v2"
	"slices"
	"sync"
	"testing"
	"testing/synctest"

	. "github.com/dogmatiq/enginekit/x/xsync"
	"golang.org/x/sync/errgroup"
)

func TestObservable(t *testing.T) {
	t.Run("notifies multiple readers of changes", func(t *testing.T) {
		synctest.Test(t, func(t *testing.T) {
			var (
				value   Observable[int]
				done    = make(chan struct{})
				want    = []int{0}
				readers errgroup.Group
			)

			go func() {
				for range 10 {
					synctest.Wait()

					n := rand.Int()
					want = append(want, n)
					value.Store(n)
				}

				close(done)
			}()

			for range 10 {
				readers.Go(func() error {
					var got []int

					for {
						v, changed := value.Load()
						got = append(got, v)

						select {
						case <-changed:
						case <-done:
							if !slices.Equal(got, want) {
								return fmt.Errorf("unexpected values: got %v, want %v", got, want)
							}
							return nil
						}
					}
				})
			}

			if err := readers.Wait(); err != nil {
				t.Fatal(err)
			}
		})
	})

	t.Run("does not produce unexpected values with multiple writers", func(t *testing.T) {
		synctest.Test(t, func(t *testing.T) {
			var (
				value   Observable[int]
				stored  sync.Map
				writers sync.WaitGroup
			)

			stored.Store(0, true)

			for range 3 {
				writers.Go(func() {
					for range 100 {
						n := rand.Int()
						stored.Store(n, true)
						value.Store(n)
					}
				})
			}

			done := make(chan struct{})
			go func() {
				writers.Wait()
				close(done)
			}()

			for {
				v, changed := value.Load()

				if _, ok := stored.Load(v); !ok {
					t.Fatalf("unexpected value: got %d", v)
				}

				select {
				case <-changed:
				case <-done:
					return
				}
			}
		})
	})
}
