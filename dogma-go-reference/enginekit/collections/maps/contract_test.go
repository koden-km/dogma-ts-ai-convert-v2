package maps_test

import (
	"iter"
	"slices"
	"testing"

	. "github.com/dogmatiq/enginekit/collections/maps"
	"pgregory.net/rapid"
)

type contract[K, V, I any] interface {
	*I

	Set(K, V) *I
	Update(K, func(*V))
	Remove(...K)
	Clear()

	Len() int
	Has(keys ...K) bool
	Get(K) V
	TryGet(K) (V, bool)

	Clone() *I
	Merge(*I) *I
	Select(func(K, V) bool) *I
	Project(func(K, V) (K, V, bool)) *I

	All() iter.Seq2[K, V]
	Keys() iter.Seq[K]
	Values() iter.Seq[V]
}

type orderedContract[K, V, I any] interface {
	contract[K, V, I]

	Reverse() iter.Seq2[K, V]
	ReverseKeys() iter.Seq[K]
	ReverseValues() iter.Seq[V]
}

func testMap[
	M contract[K, int, I],
	K, I any,
](
	t *testing.T,
	newMap func(...Pair[K, int]) M,
	fromSeq func(iter.Seq2[K, int]) M,
	isEqual func(K, K) bool,
	gen *rapid.Generator[K],
) {
	t.Parallel()
	t.Helper()

	rapid.Check(t, func(t *rapid.T) {
		var (
			subject  M
			expected []Pair[K, int]
		)

		add := func(k K, v int) {
			expected = append(expected, Pair[K, int]{k, v})
		}

		remove := func(k K) {
			for i, p := range expected {
				if isEqual(p.Key, k) {
					expected[i] = expected[len(expected)-1]
					expected = expected[:len(expected)-1]
					return
				}
			}
		}

		replace := func(k K, v int) {
			for i, p := range expected {
				if isEqual(p.Key, k) {
					expected[i].Value = v
					return
				}
			}
		}

		get := func(k K) (int, bool) {
			for _, p := range expected {
				if isEqual(p.Key, k) {
					return p.Value, true
				}
			}
			return 0, false
		}

		drawExistingKey := func(t *rapid.T) K {
			if len(expected) == 0 {
				t.Skip("map is empty")
			}

			var keys []K
			for _, p := range expected {
				keys = append(keys, p.Key)
			}

			return rapid.
				SampledFrom(keys).
				Draw(t, "existing key")
		}

		drawNewKey := func(t *rapid.T) K {
			for {
				k := gen.Draw(t, "new key")
				if _, ok := get(k); !ok {
					return k
				}
				t.Logf("[rapid] discard key %#v, already in the map", k)
			}
		}

		drawValue := func(t *rapid.T) int {
			return rapid.Int().Draw(t, "value")
		}

		t.Repeat(
			map[string]func(*rapid.T){
				"replace the subject with a new one": func(t *rapid.T) {
					expected = nil

					n := rapid.
						IntRange(0, 10).
						Draw(t, "number of elements")

					for range n {
						k := drawNewKey(t)
						v := drawValue(t)
						add(k, v)
					}

					subject = newMap(expected...)
				},
				"replace the subject with a new one constructed from a sequence": func(t *rapid.T) {
					expected = nil

					n := rapid.
						IntRange(0, 10).
						Draw(t, "number of elements")

					for range n {
						k := drawNewKey(t)
						v := drawValue(t)
						add(k, v)
					}

					subject = fromSeq(
						func(yield func(K, int) bool) {
							for _, p := range expected {
								if !yield(p.Key, p.Value) {
									break
								}
							}
						},
					)
				},
				"set the subject to nil": func(t *rapid.T) {
					subject = nil
					expected = nil
				},
				"add a new key": func(t *rapid.T) {
					k := drawNewKey(t)
					v := drawValue(t)

					if subject != nil {
						add(k, v)
					} else {
						defer func() {
							want := "Set() called on a nil map"
							got := recover()
							if got != want {
								t.Fatalf("unexpected panic value: got %#v, want %#v", got, want)
							}
						}()
					}

					snapshot := subject
					subject = subject.Set(k, v)

					if subject != snapshot {
						t.Fatal("Set() should return the same map")
					}
				},
				"overwrite an existing key": func(t *rapid.T) {
					k := drawExistingKey(t)
					v := drawValue(t)

					replace(k, v)

					snapshot := subject
					subject = subject.Set(k, v)

					if subject != snapshot {
						t.Fatal("Set() should return the same map")
					}
				},
				"update a new key": func(t *rapid.T) {
					k := drawNewKey(t)
					v := drawValue(t)

					if subject != nil {
						add(k, v)
					} else {
						defer func() {
							want := "Update() called on a nil map"
							got := recover()
							if got != want {
								t.Fatalf("unexpected panic value: got %#v, want %#v", got, want)
							}
						}()
					}

					subject.Update(k, func(x *int) { *x = v })
				},
				"update an existing key": func(t *rapid.T) {
					k := drawExistingKey(t)
					v := drawValue(t)

					subject.Update(k, func(x *int) { *x = v })
					replace(k, v)
				},
				"remove an existing key": func(t *rapid.T) {
					k := drawExistingKey(t)
					subject.Remove(k)
					remove(k)
				},
				"remove a key that is not in the map": func(t *rapid.T) {
					k := drawNewKey(t)
					subject.Remove(k)
				},
				"remove multiple keys": func(t *rapid.T) {
					if subject.Len() < 2 {
						t.Skip("map has fewer than 2 elements")
					}

					k1 := drawExistingKey(t)
					remove(k1)

					k2 := drawExistingKey(t)
					remove(k2)

					subject.Remove(k1, k2)
				},
				"remove nothing": func(t *rapid.T) {
					subject.Remove()
				},
				"check for presence of key": func(t *rapid.T) {
					k := drawExistingKey(t)
					if !subject.Has(k) {
						t.Fatalf("expected %#v to be in the map", k)
					}
				},
				"check for absence of key": func(t *rapid.T) {
					k := drawNewKey(t)
					if subject.Has(k) {
						t.Fatalf("did not expect %#v to be in the map", k)
					}
				},
				"check for presence of multiple keys": func(t *rapid.T) {
					if subject.Len() < 2 {
						t.Skip("map has fewer than 2 elements")
					}

					k1 := drawExistingKey(t)
					k2 := drawExistingKey(t)

					if !subject.Has(k1, k2) {
						t.Fatalf("expected %#v and %#v to be in the map", k1, k2)
					}
				},
				"check for absence of multiple keys": func(t *rapid.T) {
					k1 := drawNewKey(t)
					k2 := drawNewKey(t)

					if subject.Has(k1, k2) {
						t.Fatalf("did not expect %#v and %#v to be in the map", k1, k2)
					}
				},
				"check for absence of one of the given keys": func(t *rapid.T) {
					k1 := drawExistingKey(t)
					k2 := drawNewKey(t)

					if subject.Has(k1, k2) {
						t.Fatalf("did not expect both %#v and %#v to be in the map", k1, k2)
					}

					if subject.Has(k2, k1) {
						t.Fatalf("did not expect both %#v and %#v to be in the map", k2, k1)
					}
				},
				"check for presence of nothing": func(t *rapid.T) {
					if !subject.Has() {
						t.Fatal("expected Has() with no arguments to return true")
					}
				},
				"get the value associated with a key": func(t *rapid.T) {
					k := drawExistingKey(t)
					v := subject.Get(k)

					if x, _ := get(k); v != x {
						t.Fatalf("unexpected value for key %#v: got %#v, want %#v", k, v, x)
					}
				},
				"get the value associated with a key that is not in %#v": func(t *rapid.T) {
					k := drawNewKey(t)
					v := subject.Get(k)

					if v != 0 {
						t.Fatalf("unexpected value for key %#v: got %#v, want 0", k, v)
					}
				},
				"try to get the value associated with a key": func(t *rapid.T) {
					k := drawExistingKey(t)

					v, ok := subject.TryGet(k)
					if !ok {
						t.Fatalf("expected %#v to be in the map", k)
					}

					if x, _ := get(k); v != x {
						t.Fatalf("unexpected value for key %#v: got %#v, want %#v", k, v, x)
					}
				},
				"try to get the value associated with a key that is not in the map": func(t *rapid.T) {
					k := drawNewKey(t)

					v, ok := subject.TryGet(k)
					if v != 0 {
						t.Fatalf("unexpected value for key %#v: got %#v, want 0", k, v)
					}

					if ok {
						t.Fatalf("did not expect %#v to be in the map", k)
					}
				},
				"clear the map": func(t *rapid.T) {
					subject.Clear()
					expected = nil
				},
				"clone the map": func(t *rapid.T) {
					snapshot := subject
					subject = subject.Clone()

					if subject == nil {
						t.Fatal("the result of a clone should never be nil")
					}

					if snapshot != nil {
						k := drawNewKey(t)
						v := drawValue(t)
						snapshot.Set(k, v)

						if subject.Has(k) {
							t.Fatalf("expected clone to be a shallow copy")
						}
					}
				},
				"merge with disjoint map": func(t *rapid.T) {
					n := rapid.
						IntRange(0, 3).
						Draw(t, "number of elements")

					other := newMap()

					for range n {
						k := drawNewKey(t)
						v := drawValue(t)
						other.Set(k, v)
						add(k, v)
					}

					subject = subject.Merge(other)
					if subject == nil {
						t.Fatal("the result of a merge should never be nil")
					}
				},
				"merge with itself": func(t *rapid.T) {
					subject = subject.Merge(subject)
					if subject == nil {
						t.Fatal("the result of a merge should never be nil")
					}
				},
				"merge with a nil map": func(t *rapid.T) {
					subject = subject.Merge(nil)
					if subject == nil {
						t.Fatal("the result of a merge should never be nil")
					}
				},
				"select a subset": func(t *rapid.T) {
					subject = subject.Select(
						func(k K, v int) bool {
							if v%2 == 0 {
								return true
							} else {
								remove(k)
								return false
							}
						},
					)

					if subject == nil {
						t.Fatal("the result of a selection should never be nil")
					}
				},
				"project a subset": func(t *rapid.T) {
					subject = subject.Project(
						func(k K, v int) (K, int, bool) {
							if v%2 == 0 {
								replace(k, v*2)
								return k, v * 2, true
							} else {
								remove(k)
								return k, v, false
							}
						},
					)

					if subject == nil {
						t.Fatal("the result of a projection should never be nil")
					}
				},
				"project with key modifications": func(t *rapid.T) {
					if subject.Len() == 0 {
						t.Skip("map is empty")
					}

					subject = subject.Project(
						func(k K, v int) (K, int, bool) {
							remove(k)
							k = drawNewKey(t)
							add(k, v)
							return k, v, true
						},
					)

					if subject == nil {
						t.Fatal("the result of a projection should never be nil")
					}
				},
				"": func(t *rapid.T) {
					if subject.Len() != len(expected) {
						t.Fatalf("unexpected length: got %d, want %d", subject.Len(), len(expected))
					}

					for k, v := range subject.All() {
						x, ok := get(k)
						if !ok {
							t.Fatalf("map contains an unexpected key: %#v", k)
						}

						if x != v {
							t.Fatalf("unexpected value for key %#v: got %#v, want %#v", k, v, x)
						}
					}

					for k := range subject.Keys() {
						if _, ok := get(k); !ok {
							t.Fatalf("map contains an unexpected key: %#v", k)
						}
					}

					values := slices.Sorted(subject.Values())
					var expectedValues []int
					for _, p := range expected {
						expectedValues = append(expectedValues, p.Value)
					}
					slices.Sort(expectedValues)

					if len(values) != len(expectedValues) {
						t.Fatalf("unexpected number of values: got %d, want %d", len(values), len(expectedValues))
					}

					for i, want := range expectedValues {
						got := values[i]
						if got != want {
							t.Fatalf("unexpected value at index %d: got %d, want %d", i, got, want)
						}
					}
				},
			},
		)
	})
}

func testOrderedMap[
	M orderedContract[K, int, I],
	K, I any,
](
	t *testing.T,
	fromPairs func(...Pair[K, int]) M,
	fromSeq func(iter.Seq2[K, int]) M,
	cmp func(K, K) int,
	gen *rapid.Generator[K],
) {
	t.Helper()

	testMap(
		t,
		fromPairs,
		fromSeq,
		func(x, y K) bool { return cmp(x, y) == 0 },
		gen,
	)

	t.Run("keys are iterated in order", func(t *testing.T) {
		t.Parallel()

		rapid.Check(t, func(t *rapid.T) {
			subject := fromPairs()

			n := rapid.
				IntRange(0, 10).
				Draw(t, "number of elements")

			for range n {
				k := gen.Draw(t, "key")
				v := rapid.Int().Draw(t, "value")
				subject.Set(k, v)
			}

			var prev *K
			for k := range subject.All() {
				if prev != nil {
					if cmp(k, *prev) <= 0 {
						t.Fatalf("keys are not in order: %#v <= %#v", k, prev)
					}
				}

				prev = &k
			}

			prev = nil
			for k := range subject.Reverse() {
				if prev != nil {
					if cmp(k, *prev) >= 0 {
						t.Fatalf("keys are not in reverse order: %#v >= %#v", k, prev)
					}
				}
				prev = &k
			}

			prev = nil
			for k := range subject.Keys() {
				if prev != nil {
					if cmp(k, *prev) <= 0 {
						t.Fatalf("keys are not in order: %#v <= %#v", k, prev)
					}
				}
				prev = &k
			}

			prev = nil
			for k := range subject.ReverseKeys() {
				if prev != nil {
					if cmp(k, *prev) >= 0 {
						t.Fatalf("keys are not in reverse order: %#v >= %#v", k, prev)
					}
				}
				prev = &k
			}

			forwardValues := slices.Collect(subject.Values())
			reverseValues := slices.Collect(subject.ReverseValues())

			i := 0
			for k, v := range subject.All() {
				if forwardValues[i] != v {
					t.Fatalf("unexpected value for key %#v: got %#v, want %#v", k, v, forwardValues[i])
				}
				if reverseValues[len(reverseValues)-1-i] != v {
					t.Fatalf("unexpected value for key %#v (reverse): got %#v, want %#v", k, v, reverseValues[len(reverseValues)-1-i])
				}
				i++
			}
		})
	})
}
